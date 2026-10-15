'use server';

import { SUPPORTED_TYPES, decideRoute, runChecks, sha256, type Invoice } from '@paperflow/extraction';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ensureVisitorId } from '@/server/auth';
import { addEvent, addReview, createDocument, getDocument, transition, updateDocument } from '@/server/documents';
import { env } from '@/server/env';
import { demoLimitMessage } from '@/server/limits';
import { WorkflowUnavailableError, resumeWorkflow, startIntake } from '@/server/n8n';
import { sheetRow } from '@/server/result';
import { verifyReviewToken } from '@/server/review-token';
import { sampleById } from '@/server/samples';

export interface ActionState {
  error?: string;
}

const MAX_BYTES = 4 * 1024 * 1024;

/** Stores the document, starts the n8n workflow and opens the live view */
async function intake(input: {
  source: 'upload' | 'sample';
  sampleId?: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}) {
  const visitor = await ensureVisitorId();
  const limit = await demoLimitMessage(visitor);
  if (limit) return { error: limit };

  const doc = await createDocument({ ...input, visitorId: visitor, sha256: sha256(input.bytes) });
  await addEvent(doc.id, 'app', 'received', 'done', `Received ${input.filename}`, { size: input.bytes.length });
  try {
    await startIntake(doc.id);
    await addEvent(doc.id, 'app', 'workflow_triggered', 'done', 'Sent to the n8n workflow');
  } catch (err) {
    await transition(doc.id, ['received'], 'failed');
    await addEvent(doc.id, 'app', 'workflow_triggered', 'failed', 'The n8n workflow is not reachable right now', {
      error: err instanceof WorkflowUnavailableError ? err.message : String(err),
    });
  }
  redirect(`/documents/${doc.id}`);
}

export async function submitSample(sampleId: string): Promise<ActionState> {
  const sample = sampleById(sampleId);
  if (!sample) return { error: 'Unknown sample' };
  // Samples are static files of this app; fetching them keeps them out of the server bundle
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  const res = await fetch(`${origin}/samples/${sample.file}`);
  if (!res.ok) return { error: 'Could not load the sample' };
  return intake({
    source: 'sample',
    sampleId,
    filename: sample.file,
    mimeType: sample.mimeType,
    bytes: Buffer.from(await res.arrayBuffer()),
  });
}

export async function submitUpload(_prev: ActionState, form: FormData): Promise<ActionState> {
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a PDF or a photo of an invoice' };
  if (file.size > MAX_BYTES) return { error: 'The file is larger than 4 MB' };
  if (!SUPPORTED_TYPES.includes(file.type)) return { error: 'Send a PDF, JPEG, PNG or WebP file' };
  return intake({
    source: 'upload',
    filename: file.name.slice(0, 200),
    mimeType: file.type,
    bytes: Buffer.from(await file.arrayBuffer()),
  });
}

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.trim() : '');
/** "1,234.50", "1234,50" and "1 234.50" all mean the same amount */
const num = (v: FormDataEntryValue | null) => {
  const s = str(v).replace(/\s/g, '');
  if (s === '') return null;
  return Number(s.includes('.') ? s.replaceAll(',', '') : s.replace(',', '.'));
};
const text = (v: FormDataEntryValue | null) => str(v) || null;

/** Applies the reviewer's edits to the extracted invoice; returns the new invoice and the names of changed fields */
function applyCorrections(inv: Invoice, form: FormData) {
  const next: Invoice = structuredClone(inv);
  next.vendor.name = text(form.get('vendorName'));
  next.invoiceNumber = text(form.get('invoiceNumber'));
  next.issueDate = text(form.get('issueDate'));
  next.dueDate = text(form.get('dueDate'));
  next.currency = text(form.get('currency'))?.toUpperCase() ?? null;
  next.subtotal = num(form.get('subtotal'));
  next.taxAmount = num(form.get('taxAmount'));
  next.total = num(form.get('total'));
  const fields: [string, unknown, unknown][] = [
    ['vendorName', inv.vendor.name, next.vendor.name],
    ['invoiceNumber', inv.invoiceNumber, next.invoiceNumber],
    ['issueDate', inv.issueDate, next.issueDate],
    ['dueDate', inv.dueDate, next.dueDate],
    ['currency', inv.currency, next.currency],
    ['subtotal', inv.subtotal, next.subtotal],
    ['taxAmount', inv.taxAmount, next.taxAmount],
    ['total', inv.total, next.total],
  ];
  const changed = fields.filter(([, a, b]) => a !== b).map(([name]) => name);
  // Whatever the reviewer saw and accepted is no longer uncertain
  next.uncertainFields = [];
  return { next, changed };
}

/** A person approves (optionally with corrections) or rejects; the waiting n8n workflow continues with the answer */
export async function submitReview(token: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const id = verifyReviewToken(token, env().REVIEW_SECRET);
  if (!id) return { error: 'This review link is invalid or has expired.' };
  const doc = await getDocument(id);
  if (!doc?.invoice || !doc.decision) return { error: 'Document not found.' };
  if (doc.status !== 'needs_review' || !doc.resumeUrl) return { error: 'This invoice has already been reviewed.' };

  const decision = form.get('decision') === 'reject' ? 'reject' : 'approve';
  const { next, changed } = applyCorrections(doc.invoice, form);
  if ([next.subtotal, next.taxAmount, next.total].some((n) => Number.isNaN(n))) {
    return { error: 'Amounts must be numbers.' };
  }
  const checks = runChecks(next, { today: new Date(), duplicateOf: doc.duplicateOf });
  const routeAfter = decideRoute(next, checks);

  // Claiming the status first makes the review single-use, even with two tabs open
  if (!(await transition(id, ['needs_review'], decision === 'approve' ? 'approved' : 'rejected'))) {
    return { error: 'This invoice has already been reviewed.' };
  }
  await updateDocument(id, { invoice: next, checks, decision: routeAfter });
  await addReview(id, decision, changed.length ? next : null);
  await addEvent(
    id,
    'person',
    'reviewed',
    'done',
    decision === 'reject'
      ? 'Rejected by the reviewer'
      : changed.length
        ? `Approved with ${changed.length} correction${changed.length > 1 ? 's' : ''}`
        : 'Approved by the reviewer',
    changed.length ? { corrected: changed } : undefined,
  );

  try {
    await resumeWorkflow(doc.resumeUrl, {
      decision,
      corrected: changed,
      row: sheetRow(doc, next, routeAfter, 'Reviewer'),
    });
  } catch {
    await transition(id, ['approved', 'rejected'], 'needs_review');
    await addEvent(id, 'app', 'reviewed', 'failed', 'Could not reach the n8n workflow; the review can be sent again');
    return { error: 'Could not reach the workflow. Please try again in a minute.' };
  }
  redirect(`/review/${token}?done=1`);
}
