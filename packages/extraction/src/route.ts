import { failed, type CheckCode, type CheckResult } from './checks.js';
import type { Invoice, InvoiceField } from './schema.js';

export type Confidence = 'high' | 'medium' | 'low';

/** A misread in these fields would record the wrong payment, so uncertainty here always needs a person */
const CRITICAL_FIELDS: InvoiceField[] = ['vendorName', 'invoiceNumber', 'issueDate', 'currency', 'total'];

export function confidenceOf(inv: Invoice): Confidence {
  if (inv.uncertainFields.some((f) => CRITICAL_FIELDS.includes(f))) return 'low';
  return inv.uncertainFields.length > 0 ? 'medium' : 'high';
}

/**
 * Approximate USD value of one unit, used only to compare a total with the auto-approval limit.
 * Unknown currencies always go to review, so these never need to be exact.
 */
export const APPROX_USD_RATE: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, CHF: 1.12, CAD: 0.73, AUD: 0.66, NZD: 0.6, SEK: 0.095, NOK: 0.093, DKK: 0.145,
  PLN: 0.25, CZK: 0.043, JPY: 0.0067, CNY: 0.14, HKD: 0.128, SGD: 0.74, INR: 0.012, VND: 0.00004, AED: 0.27,
  BRL: 0.18, MXN: 0.055, ZAR: 0.055,
}; // prettier-ignore

export interface RoutePolicy {
  /** Totals above this (converted to USD) always need a person */
  autoApproveMaxUsd: number;
  /** Lowest confidence that may be recorded without review */
  minConfidence: Confidence;
}

export const DEFAULT_POLICY: RoutePolicy = { autoApproveMaxUsd: 5000, minConfidence: 'high' };

export interface RouteDecision {
  route: 'auto_approve' | 'review';
  confidence: Confidence;
  totalUsd: number | null;
  reasons: string[];
}

const RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

/** Nothing is ever rejected automatically: anything doubtful goes to a person, who can approve, fix or reject */
export function decideRoute(inv: Invoice, checks: CheckResult[], policy: RoutePolicy = DEFAULT_POLICY): RouteDecision {
  const confidence = confidenceOf(inv);
  const rate = inv.currency ? APPROX_USD_RATE[inv.currency] : undefined;
  const totalUsd = inv.total !== null && rate !== undefined ? Math.round(inv.total * rate * 100) / 100 : null;

  const reasons = failed(checks).map((c) => c.message);
  if (RANK[confidence] < RANK[policy.minConfidence]) {
    reasons.push(`Unsure about: ${inv.uncertainFields.join(', ')}`);
  }
  if (totalUsd === null) {
    if (inv.total !== null) reasons.push(`No exchange rate for ${inv.currency ?? 'an unknown currency'}`);
  } else if (totalUsd > policy.autoApproveMaxUsd) {
    reasons.push(
      `Total of about $${Math.round(totalUsd)} is above the $${policy.autoApproveMaxUsd} auto-approval limit`,
    );
  }

  return { route: reasons.length ? 'review' : 'auto_approve', confidence, totalUsd, reasons };
}

/** Failures that may be the model's misreading rather than a real problem with the invoice */
const READING_CHECKS: CheckCode[] = ['required_fields', 'line_items_sum', 'totals', 'tax_rate', 'dates', 'currency'];

/** Whether a stronger model should read the document again before a person sees it */
export function needsSecondOpinion(inv: Invoice, checks: CheckResult[]): boolean {
  if (!inv.isInvoice) return false;
  return confidenceOf(inv) === 'low' || failed(checks).some((c) => READING_CHECKS.includes(c.code));
}
