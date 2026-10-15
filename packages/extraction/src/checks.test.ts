import { describe, expect, it } from 'vitest';
import { parseIsoDate, runChecks, type CheckCode } from './checks.js';
import { SAMPLE_INVOICE } from './fake-extractor.js';
import type { Invoice } from './schema.js';

const today = new Date('2026-10-15T12:00:00Z');
const invoice = (patch: Partial<Invoice> = {}): Invoice => ({ ...structuredClone(SAMPLE_INVOICE), ...patch });
const statusOf = (inv: Invoice, code: CheckCode, duplicateOf: string | null = null) =>
  runChecks(inv, { today, duplicateOf }).find((c) => c.code === code)?.status;

describe('runChecks', () => {
  it('passes a clean invoice', () => {
    const results = runChecks(invoice(), { today });
    expect(results.filter((c) => c.status === 'fail')).toEqual([]);
  });

  it('catches line items that do not add up to the subtotal', () => {
    const inv = invoice({ subtotal: 650, total: 780, taxAmount: 130 });
    const check = runChecks(inv, { today }).find((c) => c.code === 'line_items_sum');
    expect(check?.status).toBe('fail');
    expect(check?.message).toContain('600.00');
  });

  it('allows rounding of a few cents', () => {
    const inv = invoice({
      lineItems: [
        { description: 'A', quantity: 3, unitPrice: 33.333, amount: 100 },
        { description: 'B', quantity: 1, unitPrice: 500.02, amount: 500.02 },
      ],
    });
    expect(statusOf(inv, 'line_items_sum')).toBe('pass');
  });

  it('compares line items with the total when there is no subtotal', () => {
    expect(statusOf(invoice({ subtotal: null }), 'line_items_sum')).toBe('pass');
    expect(statusOf(invoice({ subtotal: null, total: 800 }), 'line_items_sum')).toBe('fail');
  });

  it('checks subtotal minus discount plus tax equals the total', () => {
    expect(statusOf(invoice({ total: 700 }), 'totals')).toBe('fail');
    const discounted = invoice({ discount: 100, taxAmount: 100, total: 600 });
    expect(statusOf(discounted, 'totals')).toBe('pass');
    expect(statusOf(discounted, 'tax_rate')).toBe('pass');
  });

  it('checks the tax amount against the rate', () => {
    expect(statusOf(invoice({ taxRate: 10 }), 'tax_rate')).toBe('fail');
    expect(statusOf(invoice({ taxRate: null }), 'tax_rate')).toBe('skip');
  });

  it('flags impossible, reversed and future dates', () => {
    expect(statusOf(invoice({ issueDate: '2026-02-30' }), 'dates')).toBe('fail');
    expect(statusOf(invoice({ dueDate: '2026-09-01' }), 'dates')).toBe('fail');
    expect(statusOf(invoice({ issueDate: '2026-12-01', dueDate: null }), 'dates')).toBe('fail');
    expect(statusOf(invoice({ issueDate: '2023-01-10', dueDate: null }), 'dates')).toBe('fail');
  });

  it('lists every missing required field', () => {
    const inv = invoice({ invoiceNumber: null, total: null, currency: null });
    const check = runChecks(inv, { today }).find((c) => c.code === 'required_fields');
    expect(check?.status).toBe('fail');
    expect(check?.message).toBe('Missing: invoice number, currency, total');
  });

  it('flags unknown currencies, duplicates, non-invoices and hidden instructions', () => {
    expect(statusOf(invoice({ currency: 'XYZ' }), 'currency')).toBe('fail');
    expect(statusOf(invoice(), 'duplicate', 'doc_123')).toBe('fail');
    expect(statusOf(invoice({ isInvoice: false }), 'is_invoice')).toBe('fail');
    expect(statusOf(invoice({ suspiciousInstructions: true }), 'instructions')).toBe('fail');
  });
});

describe('parseIsoDate', () => {
  it('accepts only real YYYY-MM-DD dates', () => {
    expect(parseIsoDate('2026-10-01')?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('01/10/2026')).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
  });
});
