import 'server-only';
import {
  CascadeExtractor,
  ClaudeExtractor,
  DEFAULT_POLICY,
  FakeExtractor,
  decideRoute,
  failed,
  runChecks,
  sha256,
  totalCost,
  type Extractor,
  type RoutePolicy,
} from '@paperflow/extraction';
import {
  addEvent,
  findDuplicate,
  getDocument,
  getFile,
  transition,
  updateDocument,
  type DocumentMeta,
} from './documents';
import { env } from './env';
import { createReviewToken } from './review-token';
import { sampleBySha } from './samples';
import { toResult, type ExtractionResult } from './result';

let cached: Extractor | undefined;

/** Haiku first, Sonnet for unreliable readings; without an API key a fake answers for the demo samples */
function extractor(): Extractor {
  if (cached) return cached;
  const e = env();
  cached = e.ANTHROPIC_API_KEY
    ? new CascadeExtractor(
        new ClaudeExtractor(e.ANTHROPIC_API_KEY, e.EXTRACT_MODEL),
        new ClaudeExtractor(e.ANTHROPIC_API_KEY, e.FALLBACK_MODEL),
      )
    : new FakeExtractor((doc) => sampleBySha(sha256(doc.bytes))?.invoice);
  return cached;
}

export const reviewUrl = (id: string) => `${env().WEB_URL}/review/${createReviewToken(id, env().REVIEW_SECRET)}`;

export class DocumentNotFoundError extends Error {}

/**
 * Reads one document, checks it and decides the route. Called by the n8n workflow; a retried call returns the
 * stored result instead of paying for a second reading.
 */
export async function processDocument(id: string, policy: RoutePolicy = DEFAULT_POLICY): Promise<ExtractionResult> {
  const doc = await getDocument(id);
  if (!doc) throw new DocumentNotFoundError(id);
  if (doc.invoice && doc.decision) return toResult(doc, reviewUrl(id));

  await transition(id, ['received', 'extracting'], 'extracting');
  await addEvent(id, 'app', 'extracting', 'info', 'Reading the document with Claude');

  const file = await getFile(id);
  let read;
  try {
    read = await extractor().extract({ bytes: file!.file, mimeType: doc.mimeType, filename: doc.filename });
  } catch (err) {
    await transition(id, ['extracting'], 'failed');
    await addEvent(id, 'app', 'extracting', 'failed', 'Could not read the document', { error: String(err) });
    throw err;
  }

  const cost = totalCost(read.usage);
  const models = read.usage.map((u) => u.model);
  await addEvent(
    id,
    'app',
    'extracted',
    'done',
    read.escalated ? `Read by ${models[0]}, then re-read by ${models[1]}` : `Read by ${models[0]}`,
    { models, costUsd: cost, ms: read.usage.reduce((s, u) => s + u.durationMs, 0) },
  );

  const duplicateOf = await findDuplicate(doc, read.invoice);
  const checks = runChecks(read.invoice, { today: new Date(), duplicateOf });
  const decision = decideRoute(read.invoice, checks, policy);
  const problems = failed(checks);
  await addEvent(
    id,
    'app',
    'checked',
    problems.length ? 'failed' : 'done',
    problems.length ? `${problems.length} check${problems.length > 1 ? 's' : ''} failed` : 'All checks passed',
    { failed: problems.map((c) => c.message) },
  );

  const status = decision.route === 'auto_approve' ? 'approved' : 'needs_review';
  await updateDocument(id, {
    invoice: read.invoice,
    checks,
    decision,
    duplicateOf,
    usage: read.usage,
    costUsd: cost,
    status,
  });
  await addEvent(
    id,
    'app',
    'routed',
    'done',
    decision.route === 'auto_approve' ? 'Clean: recorded without review' : 'Needs a person to review',
    { route: decision.route, reasons: decision.reasons, confidence: decision.confidence },
  );

  const updated = (await getDocument(id)) as DocumentMeta;
  return toResult(updated, reviewUrl(id));
}
