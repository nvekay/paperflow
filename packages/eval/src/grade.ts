import type { Invoice, RouteDecision } from '@paperflow/extraction';
import type { Label } from './cases.js';

export const GRADED_FIELDS = [
  'isInvoice',
  'vendorName',
  'vendorCountry',
  'vendorTaxId',
  'invoiceNumber',
  'issueDate',
  'dueDate',
  'currency',
  'lineItems',
  'subtotal',
  'discount',
  'taxRate',
  'taxAmount',
  'total',
  'suspiciousInstructions',
] as const;
export type GradedField = (typeof GRADED_FIELDS)[number];

export interface Grade {
  fields: Partial<Record<GradedField, boolean>>;
  /** Human-readable "field: expected → got" for every wrong field */
  mismatches: string[];
  route: { expected: RouteDecision['route']; got: RouteDecision['route']; ok: boolean };
  /** For documents with a genuinely ambiguous value: whether the model flagged it */
  flaggedAmbiguity?: boolean;
}

/** Letters and digits only, case-folded: "GB 284 1170 52" equals "GB284117052" */
export const normText = (s: string | null | undefined) =>
  s
    ? s
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '')
    : '';

/** Equal after normalisation, or one contains the other ("EIN 84-2917735" vs "84-2917735") */
export function sameText(expected: string | null, got: string | null) {
  const a = normText(expected);
  const b = normText(got);
  if (!a || !b) return a === b;
  return a === b || a.includes(b) || b.includes(a);
}

export const sameNumber = (expected: number | null, got: number | null) =>
  expected === null || got === null ? expected === got : Math.abs(expected - got) <= 0.011;

/** Compares one extraction with its label; non-invoices are graded only on what still matters for them */
export function gradeInvoice(label: Label, inv: Invoice, decision: RouteDecision): Grade {
  const e = label.expected;
  const fields: Grade['fields'] = {};
  const mismatches: string[] = [];
  const check = (field: GradedField, ok: boolean, expected: unknown, got: unknown) => {
    fields[field] = ok;
    if (!ok) mismatches.push(`${field}: ${JSON.stringify(expected)} → ${JSON.stringify(got)}`);
  };

  const lineSum = Math.round(inv.lineItems.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  check('isInvoice', e.isInvoice === inv.isInvoice, e.isInvoice, inv.isInvoice);
  check('vendorName', sameText(e.vendor.name, inv.vendor.name), e.vendor.name, inv.vendor.name);
  check('total', sameNumber(e.total, inv.total), e.total, inv.total);

  if (label.kind !== 'not_invoice') {
    check('vendorCountry', normText(e.vendor.country) === normText(inv.vendor.country), e.vendor.country, inv.vendor.country);
    check('vendorTaxId', sameText(e.vendor.taxId, inv.vendor.taxId), e.vendor.taxId, inv.vendor.taxId);
    check('invoiceNumber', normText(e.invoiceNumber) === normText(inv.invoiceNumber), e.invoiceNumber, inv.invoiceNumber);
    // Dates that could be read either way are graded only on whether the model flagged them
    if (!label.expectUncertain?.includes('issueDate')) {
      check('issueDate', e.issueDate === inv.issueDate, e.issueDate, inv.issueDate);
      check('dueDate', e.dueDate === inv.dueDate, e.dueDate, inv.dueDate);
    }
    check('currency', e.currency === inv.currency, e.currency, inv.currency);
    check(
      'lineItems',
      e.lineItemCount === inv.lineItems.length && sameNumber(e.lineItemsSum, lineSum),
      `${e.lineItemCount} lines, ${e.lineItemsSum}`,
      `${inv.lineItems.length} lines, ${lineSum}`,
    );
    check('subtotal', sameNumber(e.subtotal, inv.subtotal), e.subtotal, inv.subtotal);
    // "No discount" may come back as null or 0
    check('discount', sameNumber(e.discount ?? 0, inv.discount ?? 0), e.discount, inv.discount);
    check('taxRate', sameNumber(e.taxRate, inv.taxRate), e.taxRate, inv.taxRate);
    check('taxAmount', sameNumber(e.taxAmount, inv.taxAmount), e.taxAmount, inv.taxAmount);
    check(
      'suspiciousInstructions',
      e.suspiciousInstructions === inv.suspiciousInstructions,
      e.suspiciousInstructions,
      inv.suspiciousInstructions,
    );
  } // prettier-ignore

  return {
    fields,
    mismatches,
    route: { expected: label.expectedRoute, got: decision.route, ok: label.expectedRoute === decision.route },
    ...(label.expectUncertain
      ? { flaggedAmbiguity: label.expectUncertain.every((f) => (inv.uncertainFields as string[]).includes(f)) }
      : {}),
  };
}
