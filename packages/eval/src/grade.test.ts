import { decideRoute, runChecks } from '@paperflow/extraction';
import { describe, expect, it } from 'vitest';
import { CASES } from './cases.js';
import { gradeInvoice, normText, sameText } from './grade.js';
import { EVAL_TODAY, expectedInvoice, labelOf } from './labels.js';

const caseById = (id: string) => CASES.find((c) => c.id === id)!;
const grade = (id: string, patch: (inv: ReturnType<typeof expectedInvoice>) => void = () => {}) => {
  const c = caseById(id);
  const inv = expectedInvoice(c);
  patch(inv);
  return gradeInvoice(labelOf(c), inv, decideRoute(inv, runChecks(inv, { today: EVAL_TODAY })));
};

describe('gradeInvoice', () => {
  it('gives a perfect reading full marks on every document', () => {
    for (const c of CASES) {
      const g = grade(c.id);
      expect(g.mismatches, c.id).toEqual([]);
      expect(g.route.ok, c.id).toBe(true);
    }
  });

  it('reports wrong fields with expected and actual values', () => {
    const g = grade('northwind-clean', (inv) => {
      inv.total = 1;
      inv.issueDate = '2026-01-10';
    });
    expect(g.fields.total).toBe(false);
    expect(g.mismatches.some((m) => m.startsWith('total:'))).toBe(true);
    expect(g.fields.issueDate).toBe(false);
  });

  it('accepts formatting differences in names, tax ids and missing discounts', () => {
    const g = grade('lumen-clean', (inv) => {
      inv.vendor.taxId = 'EIN 84-2917735';
      inv.vendor.name = 'LUMEN STUDIO, LLC';
      inv.discount = 0;
    });
    expect(g.mismatches).toEqual([]);
  });

  it('notices when an ambiguous value was not flagged', () => {
    expect(grade('maple-clean').flaggedAmbiguity).toBe(true);
    expect(grade('maple-clean', (inv) => void (inv.uncertainFields = [])).flaggedAmbiguity).toBe(false);
  });
});

describe('text normalisation', () => {
  it('ignores spacing, case and punctuation', () => {
    expect(normText('GB 284 1170 52')).toBe('gb284117052');
    expect(sameText('Bergmann Druck GmbH', 'Bergmann Druck GmbH.')).toBe(true);
    expect(sameText('Bergmann Druck GmbH', 'Maple Freight Inc.')).toBe(false);
    expect(sameText(null, null)).toBe(true);
  });
});

describe('dataset', () => {
  it('has unique ids and a mix of routes and formats', () => {
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length);
    const labels = CASES.map(labelOf);
    expect(labels.filter((l) => l.expectedRoute === 'auto_approve').length).toBeGreaterThan(5);
    expect(new Set(CASES.map((c) => c.format))).toEqual(new Set(['pdf', 'scan_pdf', 'photo_jpg']));
  });
});
