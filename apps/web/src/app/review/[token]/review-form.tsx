'use client';

import type { Invoice } from '@paperflow/extraction';
import { Check, X } from 'lucide-react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/format';
import { submitReview, type ActionState } from '../../actions';

interface Field {
  name: string;
  label: string;
  value: string | number | null;
  type?: 'date' | 'number';
  /** Which uncertainFields entry marks this input */
  uncertain: string;
}

/** Editable fields: the reviewer fixes what the model got wrong, then approves or rejects */
export function ReviewForm({ token, invoice }: { token: string; invoice: Invoice }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitReview.bind(null, token), {});
  const unsure = new Set<string>(invoice.uncertainFields);
  const fields: Field[] = [
    { name: 'vendorName', label: 'Vendor', value: invoice.vendor.name, uncertain: 'vendorName' },
    { name: 'invoiceNumber', label: 'Invoice number', value: invoice.invoiceNumber, uncertain: 'invoiceNumber' },
    { name: 'issueDate', label: 'Issued', value: invoice.issueDate, type: 'date', uncertain: 'issueDate' },
    { name: 'dueDate', label: 'Due', value: invoice.dueDate, type: 'date', uncertain: 'dueDate' },
    { name: 'currency', label: 'Currency', value: invoice.currency, uncertain: 'currency' },
    { name: 'subtotal', label: 'Subtotal', value: invoice.subtotal, type: 'number', uncertain: 'subtotal' },
    { name: 'taxAmount', label: 'Tax', value: invoice.taxAmount, type: 'number', uncertain: 'taxAmount' },
    { name: 'total', label: 'Total', value: invoice.total, type: 'number', uncertain: 'total' },
  ];

  return (
    <form action={action} className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.name} className="block text-sm">
            <span className="flex items-center gap-2 text-ink-500">
              {f.label}
              {unsure.has(f.uncertain) && (
                <span className="rounded bg-amber-50 px-1.5 py-px text-[11px] text-amber-800">unsure</span>
              )}
            </span>
            <input
              name={f.name}
              type={f.type === 'number' ? 'text' : (f.type ?? 'text')}
              inputMode={f.type === 'number' ? 'decimal' : undefined}
              defaultValue={f.value ?? ''}
              className={`mt-1 h-9 w-full rounded-md border bg-white px-2.5 tabular-nums focus:ring-2 focus:ring-accent/30 focus:outline-none ${
                unsure.has(f.uncertain) ? 'border-amber-300' : 'border-ink-200 focus:border-accent'
              }`}
            />
          </label>
        ))}
      </div>

      {invoice.lineItems.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-ink-600">{invoice.lineItems.length} line items</summary>
          <ul className="mt-2 divide-y divide-ink-100">
            {invoice.lineItems.map((li, i) => (
              <li key={i} className="flex justify-between gap-4 py-1.5">
                <span className="min-w-0">
                  {li.description}
                  {li.quantity !== null && <span className="text-ink-500"> × {li.quantity}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{money(li.amount, invoice.currency)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {invoice.suspiciousInstructions && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          The document contains text that tries to instruct an AI. It was ignored; check the invoice is genuine before
          approving.
        </p>
      )}

      {state.error && <p className="mt-4 text-sm text-red-700">{state.error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="submit" name="decision" value="approve" variant="primary" loading={pending}>
          <Check className="size-4" /> Approve
        </Button>
        <Button type="submit" name="decision" value="reject" variant="danger" disabled={pending}>
          <X className="size-4" /> Reject
        </Button>
      </div>
      <p className="mt-3 text-xs text-ink-500">Edits are saved with the approval and go to Google Sheets.</p>
    </form>
  );
}
