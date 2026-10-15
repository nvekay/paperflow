import { describe, expect, it } from 'vitest';
import { runChecks } from './checks.js';
import { SAMPLE_INVOICE } from './fake-extractor.js';
import { confidenceOf, decideRoute, needsSecondOpinion } from './route.js';
import type { Invoice } from './schema.js';

const today = new Date('2026-10-15T12:00:00Z');
const invoice = (patch: Partial<Invoice> = {}): Invoice => ({ ...structuredClone(SAMPLE_INVOICE), ...patch });
const route = (inv: Invoice, duplicateOf: string | null = null) =>
  decideRoute(inv, runChecks(inv, { today, duplicateOf }));

describe('decideRoute', () => {
  it('auto-approves a clean invoice under the limit', () => {
    const d = route(invoice());
    expect(d).toMatchObject({ route: 'auto_approve', confidence: 'high', reasons: [] });
    expect(d.totalUsd).toBeCloseTo(914.4);
  });

  it('sends large totals to a person', () => {
    const inv = invoice({
      lineItems: [{ description: 'Annual licence', quantity: 1, unitPrice: 9000, amount: 9000 }],
      subtotal: 9000,
      taxAmount: 1800,
      total: 10800,
    });
    const d = route(inv);
    expect(d.route).toBe('review');
    expect(d.reasons[0]).toContain('auto-approval limit');
  });

  it('sends failed checks, duplicates and uncertain fields to a person', () => {
    expect(route(invoice({ total: 700 })).route).toBe('review');
    expect(route(invoice(), 'doc_1').reasons).toEqual(['Same invoice as document doc_1']);
    const unsure = route(invoice({ uncertainFields: ['dueDate'] }));
    expect(unsure).toMatchObject({ route: 'review', confidence: 'medium' });
    expect(unsure.reasons).toEqual(['Unsure about: dueDate']);
  });

  it('never auto-approves a currency without a known rate', () => {
    const d = route(invoice({ currency: 'KRW' }));
    expect(d.route).toBe('review');
    expect(d.totalUsd).toBeNull();
  });
});

describe('confidence and second opinions', () => {
  it('rates uncertainty in critical fields as low', () => {
    expect(confidenceOf(invoice())).toBe('high');
    expect(confidenceOf(invoice({ uncertainFields: ['paymentDetails'] }))).toBe('medium');
    expect(confidenceOf(invoice({ uncertainFields: ['total'] }))).toBe('low');
  });

  it('asks again only when the reading itself looks wrong', () => {
    const checks = (inv: Invoice) => runChecks(inv, { today, duplicateOf: 'doc_1' });
    expect(needsSecondOpinion(invoice(), checks(invoice()))).toBe(false);
    const misread = invoice({ total: 72 });
    expect(needsSecondOpinion(misread, checks(misread))).toBe(true);
    const unsure = invoice({ uncertainFields: ['invoiceNumber'] });
    expect(needsSecondOpinion(unsure, checks(unsure))).toBe(true);
    const notInvoice = invoice({ isInvoice: false, total: null });
    expect(needsSecondOpinion(notInvoice, checks(notInvoice))).toBe(false);
  });
});
