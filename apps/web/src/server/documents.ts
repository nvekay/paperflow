import 'server-only';
import { normText, type Invoice } from './normalize';
import { and, asc, count, desc, eq, gte, inArray, ne, notInArray, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db } from './db';
import {
  documents,
  events,
  reviews,
  type DocumentRow,
  type DocumentStatus,
  type EventRow,
  type EventSource,
} from './schema';

export const newDocumentId = () => `doc_${randomBytes(9).toString('base64url')}`;

/** Every column except the file bytes, which only the file route needs */
const meta = {
  id: documents.id,
  visitorId: documents.visitorId,
  source: documents.source,
  sampleId: documents.sampleId,
  filename: documents.filename,
  mimeType: documents.mimeType,
  size: documents.size,
  sha256: documents.sha256,
  status: documents.status,
  invoice: documents.invoice,
  checks: documents.checks,
  decision: documents.decision,
  duplicateOf: documents.duplicateOf,
  usage: documents.usage,
  costUsd: documents.costUsd,
  resumeUrl: documents.resumeUrl,
  sheetRow: documents.sheetRow,
  createdAt: documents.createdAt,
  updatedAt: documents.updatedAt,
};
export type DocumentMeta = Omit<DocumentRow, 'file'>;

export async function createDocument(input: {
  visitorId: string;
  source: 'upload' | 'sample';
  sampleId?: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
  sha256: string;
}): Promise<DocumentMeta> {
  const [row] = await db()
    .insert(documents)
    .values({
      id: newDocumentId(),
      visitorId: input.visitorId,
      source: input.source,
      sampleId: input.sampleId ?? null,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.bytes.length,
      sha256: input.sha256,
      file: input.bytes,
    })
    .returning(meta);
  return row!;
}

export async function getDocument(id: string): Promise<DocumentMeta | undefined> {
  const [row] = await db().select(meta).from(documents).where(eq(documents.id, id));
  return row;
}

export async function getFile(id: string) {
  const [row] = await db()
    .select({
      file: documents.file,
      mimeType: documents.mimeType,
      filename: documents.filename,
      visitorId: documents.visitorId,
    })
    .from(documents)
    .where(eq(documents.id, id));
  return row;
}

export async function updateDocument(id: string, patch: Partial<Omit<DocumentRow, 'id' | 'file' | 'createdAt'>>) {
  await db()
    .update(documents)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(documents.id, id));
}

/** Moves the status only when it is still the expected one, so a retried n8n call cannot undo a later step */
export async function transition(id: string, from: DocumentStatus[], to: DocumentStatus, patch = {}) {
  const rows = await db()
    .update(documents)
    .set({ ...patch, status: to, updatedAt: new Date() })
    .where(and(eq(documents.id, id), inArray(documents.status, from)))
    .returning({ id: documents.id });
  return rows.length > 0;
}

export async function addEvent(
  documentId: string,
  source: EventSource,
  step: string,
  status: EventRow['status'],
  message: string,
  data?: Record<string, unknown>,
) {
  await db()
    .insert(events)
    .values({ documentId, source, step, status, message, data: data ?? null });
}

export async function listEvents(documentId: string) {
  return db().select().from(events).where(eq(events.documentId, documentId)).orderBy(asc(events.id));
}

export async function listRecent(visitorId: string, limit = 20) {
  return db()
    .select(meta)
    .from(documents)
    .where(eq(documents.visitorId, visitorId))
    .orderBy(desc(documents.createdAt))
    .limit(limit);
}

export async function countSince(since: Date, visitorId?: string) {
  const [row] = await db()
    .select({ n: count() })
    .from(documents)
    .where(
      visitorId
        ? and(eq(documents.visitorId, visitorId), gte(documents.createdAt, since))
        : gte(documents.createdAt, since),
    );
  return row?.n ?? 0;
}

/**
 * An earlier document of the same visitor (one company in a real deployment) that is the same file, or the same
 * vendor's invoice with the same number. Rejected and failed documents don't count.
 */
export async function findDuplicate(doc: DocumentMeta, invoice: Invoice): Promise<string | null> {
  const candidates = await db()
    .select({ id: documents.id, sha256: documents.sha256, invoice: documents.invoice })
    .from(documents)
    .where(
      and(
        eq(documents.visitorId, doc.visitorId),
        ne(documents.id, doc.id),
        notInArray(documents.status, ['rejected', 'failed']),
        sql`${documents.createdAt} < ${doc.createdAt}`,
      ),
    )
    .orderBy(asc(documents.createdAt));
  const vendor = normText(invoice.vendor.name);
  const number = normText(invoice.invoiceNumber);
  const match = candidates.find(
    (c) =>
      c.sha256 === doc.sha256 ||
      (vendor &&
        number &&
        normText(c.invoice?.vendor.name) === vendor &&
        normText(c.invoice?.invoiceNumber) === number),
  );
  return match?.id ?? null;
}

export async function addReview(
  documentId: string,
  decision: 'approve' | 'reject',
  corrections: Partial<Invoice> | null,
) {
  await db().insert(reviews).values({ documentId, decision, corrections });
}

/** Deletes demo documents older than the given age, with their events and reviews */
export async function deleteOlderThan(cutoff: Date) {
  const rows = await db()
    .delete(documents)
    .where(sql`${documents.createdAt} < ${cutoff}`)
    .returning({ id: documents.id });
  return rows.length;
}
