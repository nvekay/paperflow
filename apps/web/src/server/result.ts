import { failed, type CheckResult, type Invoice, type RouteDecision } from '@paperflow/extraction';
import type { DocumentMeta } from './documents';

/** One flat row per invoice, as the workflow appends it to Google Sheets (keys are column names; no dots, n8n reads those as paths) */
export interface SheetRow {
  'Document ID': string;
  Received: string;
  Vendor: string;
  Country: string;
  'Tax ID': string;
  'Invoice number': string;
  'Issue date': string;
  'Due date': string;
  Currency: string;
  Subtotal: number | string;
  Discount: number | string;
  'Tax rate %': number | string;
  Tax: number | string;
  Total: number | string;
  'Total USD': number | string;
  Lines: number;
  'Approved by': string;
}

export interface ExtractionResult {
  documentId: string;
  route: RouteDecision['route'];
  confidence: RouteDecision['confidence'];
  reasons: string[];
  failedChecks: CheckResult[];
  invoice: Invoice;
  duplicateOf: string | null;
  costUsd: number;
  reviewUrl: string;
  /** Ready for the Google Sheets node; "Approved by" is filled in after a review */
  row: SheetRow;
}

const cell = <T extends string | number>(v: T | null | undefined): T | '' => v ?? '';

export function sheetRow(doc: DocumentMeta, inv: Invoice, decision: RouteDecision, approvedBy: string): SheetRow {
  return {
    'Document ID': doc.id,
    Received: doc.createdAt.toISOString().slice(0, 16).replace('T', ' '),
    Vendor: cell(inv.vendor.name),
    Country: cell(inv.vendor.country),
    'Tax ID': cell(inv.vendor.taxId),
    'Invoice number': cell(inv.invoiceNumber),
    'Issue date': cell(inv.issueDate),
    'Due date': cell(inv.dueDate),
    Currency: cell(inv.currency),
    Subtotal: cell(inv.subtotal),
    Discount: cell(inv.discount),
    'Tax rate %': cell(inv.taxRate),
    Tax: cell(inv.taxAmount),
    Total: cell(inv.total),
    'Total USD': cell(decision.totalUsd),
    Lines: inv.lineItems.length,
    'Approved by': approvedBy,
  };
}

export function toResult(doc: DocumentMeta, reviewUrl: string): ExtractionResult {
  const inv = doc.invoice!;
  const decision = doc.decision!;
  return {
    documentId: doc.id,
    route: decision.route,
    confidence: decision.confidence,
    reasons: decision.reasons,
    failedChecks: failed(doc.checks ?? []),
    invoice: inv,
    duplicateOf: doc.duplicateOf,
    costUsd: doc.costUsd ?? 0,
    reviewUrl,
    row: sheetRow(doc, inv, decision, decision.route === 'auto_approve' ? 'Auto-approved' : ''),
  };
}
