import type { CheckResult } from '@paperflow/extraction';
import { Check, Minus, X } from 'lucide-react';

const TITLES: Record<CheckResult['code'], string> = {
  is_invoice: 'Is an invoice',
  required_fields: 'Required fields',
  line_items_sum: 'Line items add up',
  totals: 'Totals add up',
  tax_rate: 'Tax matches the rate',
  dates: 'Dates make sense',
  currency: 'Known currency',
  duplicate: 'Not a duplicate',
  instructions: 'No hidden instructions',
};

/** Deterministic checks run by code on what the model read */
export function ChecksList({ checks }: { checks: CheckResult[] }) {
  return (
    <ul className="divide-y divide-ink-100 text-sm">
      {checks.map((c) => (
        <li key={c.code} className="flex items-start gap-2.5 py-2">
          {c.status === 'pass' ? (
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          ) : c.status === 'fail' ? (
            <X className="mt-0.5 size-4 shrink-0 text-red-600" />
          ) : (
            <Minus className="mt-0.5 size-4 shrink-0 text-ink-300" />
          )}
          <div>
            <div className={c.status === 'fail' ? 'font-medium text-red-800' : 'text-ink-800'}>{TITLES[c.code]}</div>
            <div className="text-xs text-ink-500">{c.message}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
