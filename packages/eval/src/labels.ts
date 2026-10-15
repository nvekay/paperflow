import { decideRoute, runChecks, type Invoice } from '@paperflow/extraction';
import type { CaseSpec, Label } from './cases.js';

/** The date the eval pretends it is, so date checks give the same answer on every run */
export const EVAL_TODAY = new Date('2026-10-15T12:00:00Z');

export const fileOf = (c: CaseSpec) => `${c.id}.${c.format === 'photo_jpg' ? 'jpg' : 'pdf'}`;

/** The invoice exactly as the document prints it: what a perfect reader would return */
export function expectedInvoice(c: CaseSpec): Invoice {
  const v = c.vendor;
  return {
    isInvoice: c.docType === 'invoice',
    vendor: { name: v.name, country: v.country, taxId: v.taxId },
    invoiceNumber: c.invoiceNumber,
    issueDate: c.issueDate,
    dueDate: c.dueDate,
    currency: v.currency,
    lineItems: c.lines.map((l) => ({ ...l })),
    subtotal: c.subtotal,
    discount: c.discount,
    taxRate: c.taxRate,
    taxAmount: c.taxAmount,
    total: c.total,
    paymentDetails: v.payment,
    uncertainFields: [
      ...(v.symbolOnly ? (['currency'] as const) : []),
      ...(c.ambiguousDate ? (['issueDate'] as const) : []),
    ],
    suspiciousInstructions: Boolean(c.injection),
    notes: null,
  };
}

export function labelOf(c: CaseSpec): Label {
  const inv = expectedInvoice(c);
  const { uncertainFields, notes: _n, paymentDetails: _p, lineItems, ...rest } = inv;
  return {
    id: c.id,
    title: c.title,
    kind: c.kind,
    file: fileOf(c),
    mimeType: c.format === 'photo_jpg' ? 'image/jpeg' : 'application/pdf',
    expected: {
      ...rest,
      lineItemCount: lineItems.length,
      lineItemsSum: Math.round(lineItems.reduce((s, l) => s + l.amount, 0) * 100) / 100,
    },
    expectedRoute: decideRoute(inv, runChecks(inv, { today: EVAL_TODAY })).route,
    ...(uncertainFields.length ? { expectUncertain: uncertainFields } : {}),
  };
}
