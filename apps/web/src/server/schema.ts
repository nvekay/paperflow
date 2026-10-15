import type { CheckResult, Invoice, LlmUsage, RouteDecision } from '@paperflow/extraction';
import { customType, index, integer, jsonb, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => 'bytea' });

export const DOCUMENT_STATUSES = [
  'received',
  'extracting',
  'needs_review',
  'approved',
  'recorded',
  'rejected',
  'failed',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** One uploaded invoice and everything known about it; the file itself is kept for review and deleted after 72 h */
export const documents = pgTable(
  'documents',
  {
    id: text('id').primaryKey(),
    visitorId: text('visitor_id').notNull(),
    source: text('source').$type<'upload' | 'sample'>().notNull(),
    sampleId: text('sample_id'),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    sha256: text('sha256').notNull(),
    file: bytea('file').notNull(),
    status: text('status').$type<DocumentStatus>().notNull().default('received'),
    invoice: jsonb('invoice').$type<Invoice>(),
    checks: jsonb('checks').$type<CheckResult[]>(),
    decision: jsonb('decision').$type<RouteDecision>(),
    duplicateOf: text('duplicate_of'),
    usage: jsonb('usage').$type<LlmUsage[]>(),
    costUsd: numeric('cost_usd', { precision: 10, scale: 6, mode: 'number' }),
    /** n8n's URL that continues the waiting workflow; secret, never sent to the browser */
    resumeUrl: text('resume_url'),
    sheetRow: text('sheet_row'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('documents_visitor_created_idx').on(t.visitorId, t.createdAt),
    index('documents_sha256_idx').on(t.visitorId, t.sha256),
  ],
);

export type EventSource = 'app' | 'n8n' | 'person';

/** The timeline of one document: steps reported by the app, by the n8n workflow and by the reviewer */
export const events = pgTable(
  'events',
  {
    id: serial('id').primaryKey(),
    documentId: text('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    source: text('source').$type<EventSource>().notNull(),
    step: text('step').notNull(),
    status: text('status').$type<'done' | 'failed' | 'waiting' | 'info'>().notNull(),
    message: text('message').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('events_document_idx').on(t.documentId, t.id)],
);

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  decision: text('decision').$type<'approve' | 'reject'>().notNull(),
  /** Fields the reviewer changed, as they stood after the change */
  corrections: jsonb('corrections').$type<Partial<Invoice>>(),
  note: text('note'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});

export type DocumentRow = typeof documents.$inferSelect;
export type EventRow = typeof events.$inferSelect;
