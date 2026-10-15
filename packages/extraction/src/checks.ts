import type { Invoice } from './schema.js';

export type CheckCode =
  | 'is_invoice'
  | 'required_fields'
  | 'line_items_sum'
  | 'totals'
  | 'tax_rate'
  | 'dates'
  | 'currency'
  | 'duplicate'
  | 'instructions';

export interface CheckResult {
  code: CheckCode;
  status: 'pass' | 'fail' | 'skip';
  message: string;
}

export interface CheckContext {
  today: Date;
  /** Id of an earlier document with the same file hash or the same vendor and invoice number */
  duplicateOf?: string | null;
}

/** ISO 4217 codes accepted without review; anything else is treated as a misread */
export const KNOWN_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'BGN',
  'JPY', 'CNY', 'HKD', 'SGD', 'INR', 'KRW', 'VND', 'THB', 'MYR', 'IDR', 'PHP', 'AED', 'SAR', 'ILS', 'TRY',
  'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'ZAR',
]); // prettier-ignore

const DAY_MS = 86_400_000;

/** Rounding of line totals and tax adds a few cents; allow 0.1% of the amount, at least 0.05 */
export const tolerance = (amount: number) => Math.max(0.05, Math.abs(amount) * 0.001);
const near = (a: number, b: number) => Math.abs(a - b) <= tolerance(Math.max(Math.abs(a), Math.abs(b)));
const money = (n: number) => n.toFixed(2);

/** Strict YYYY-MM-DD that is a real calendar date */
export function parseIsoDate(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

/**
 * Deterministic checks on what the model extracted. The model reads; code decides whether the numbers add up,
 * so an extraction mistake or a wrong invoice is caught before anything is recorded.
 */
export function runChecks(inv: Invoice, ctx: CheckContext): CheckResult[] {
  const results: CheckResult[] = [];
  const add = (code: CheckCode, status: CheckResult['status'], message: string) =>
    results.push({ code, status, message });

  add(
    'is_invoice',
    inv.isInvoice ? 'pass' : 'fail',
    inv.isInvoice ? 'Document is an invoice' : 'Not an invoice or a bill',
  );

  const missing = [
    !inv.vendor.name && 'vendor name',
    !inv.invoiceNumber && 'invoice number',
    !inv.issueDate && 'issue date',
    !inv.currency && 'currency',
    inv.total === null && 'total',
  ].filter((m): m is string => Boolean(m));
  add(
    'required_fields',
    missing.length ? 'fail' : 'pass',
    missing.length ? `Missing: ${missing.join(', ')}` : 'All required fields found',
  );

  const discount = inv.discount ?? 0;
  const tax = inv.taxAmount ?? 0;

  // Line items should add up to the subtotal (or, without one, to the total before tax and discount)
  if (inv.lineItems.length === 0) {
    add('line_items_sum', 'skip', 'No line items');
  } else {
    const sum = inv.lineItems.reduce((s, li) => s + li.amount, 0);
    const target = inv.subtotal ?? (inv.total !== null ? inv.total - tax + discount : null);
    if (target === null) add('line_items_sum', 'skip', 'No subtotal or total to compare with');
    else if (near(sum, target)) add('line_items_sum', 'pass', `Line items add up to ${money(target)}`);
    else add('line_items_sum', 'fail', `Line items add up to ${money(sum)}, but the invoice says ${money(target)}`);
  }

  if (inv.subtotal === null || inv.total === null) {
    add('totals', 'skip', 'No subtotal to compare with the total');
  } else {
    const expected = inv.subtotal - discount + tax;
    if (near(expected, inv.total)) add('totals', 'pass', `Subtotal, discount and tax add up to ${money(inv.total)}`);
    else
      add(
        'totals',
        'fail',
        `Subtotal ${money(inv.subtotal)} - discount ${money(discount)} + tax ${money(tax)} = ${money(expected)}, but the total is ${money(inv.total)}`,
      );
  }

  if (inv.taxRate === null || inv.taxAmount === null || inv.subtotal === null) {
    add('tax_rate', 'skip', 'No tax rate to check');
  } else {
    const expected = ((inv.subtotal - discount) * inv.taxRate) / 100;
    // Tax rounded per line can drift a little further than the totals
    const ok = Math.abs(expected - inv.taxAmount) <= Math.max(0.1, Math.abs(expected) * 0.01);
    add(
      'tax_rate',
      ok ? 'pass' : 'fail',
      ok
        ? `Tax ${money(inv.taxAmount)} matches ${inv.taxRate}%`
        : `${inv.taxRate}% of ${money(inv.subtotal - discount)} is ${money(expected)}, but the tax is ${money(inv.taxAmount)}`,
    );
  }

  const issued = parseIsoDate(inv.issueDate);
  const due = parseIsoDate(inv.dueDate);
  const dateProblems = [
    inv.issueDate && !issued && `issue date "${inv.issueDate}" is not a valid date`,
    inv.dueDate && !due && `due date "${inv.dueDate}" is not a valid date`,
    issued && due && due < issued && 'due date is before the issue date',
    issued && issued.getTime() > ctx.today.getTime() + 2 * DAY_MS && 'issue date is in the future',
    issued && issued.getTime() < ctx.today.getTime() - 730 * DAY_MS && 'issue date is more than two years ago',
  ].filter((m): m is string => Boolean(m));
  if (!issued && !due && dateProblems.length === 0) add('dates', 'skip', 'No dates');
  else
    add(
      'dates',
      dateProblems.length ? 'fail' : 'pass',
      dateProblems.length ? capitalize(dateProblems.join('; ')) : 'Dates are consistent',
    );

  if (!inv.currency) add('currency', 'skip', 'No currency');
  else if (KNOWN_CURRENCIES.has(inv.currency)) add('currency', 'pass', `Currency ${inv.currency}`);
  else add('currency', 'fail', `Unknown currency "${inv.currency}"`);

  add(
    'duplicate',
    ctx.duplicateOf ? 'fail' : 'pass',
    ctx.duplicateOf ? `Same invoice as document ${ctx.duplicateOf}` : 'Not seen before',
  );

  add(
    'instructions',
    inv.suspiciousInstructions ? 'fail' : 'pass',
    inv.suspiciousInstructions ? 'The document contains instructions aimed at an AI system' : 'No hidden instructions',
  );

  return results;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const failed = (checks: CheckResult[]) => checks.filter((c) => c.status === 'fail');
