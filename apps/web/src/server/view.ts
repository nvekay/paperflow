import 'server-only';
import type { DocumentMeta } from './documents';
import { reviewUrl } from './extract';
import type { EventRow } from './schema';

/** What the browser may see about a document: no file bytes, no n8n resume URL */
export function documentView(doc: DocumentMeta, events: EventRow[]) {
  return {
    id: doc.id,
    source: doc.source,
    sampleId: doc.sampleId,
    filename: doc.filename,
    mimeType: doc.mimeType,
    size: doc.size,
    status: doc.status,
    invoice: doc.invoice,
    checks: doc.checks,
    decision: doc.decision,
    duplicateOf: doc.duplicateOf,
    usage: doc.usage,
    costUsd: doc.costUsd,
    sheetRow: doc.sheetRow,
    createdAt: doc.createdAt.toISOString(),
    // The demo shows the link a reviewer would get in Slack, once the workflow waits for a review
    reviewUrl: doc.status === 'needs_review' && doc.resumeUrl ? reviewUrl(doc.id) : null,
    events: events.map((e) => ({
      id: e.id,
      source: e.source,
      step: e.step,
      status: e.status,
      message: e.message,
      data: e.data,
      at: e.at.toISOString(),
    })),
  };
}

export type DocumentView = ReturnType<typeof documentView>;
