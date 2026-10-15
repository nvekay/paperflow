import type { Invoice } from '@paperflow/extraction';
import { date, money } from '@/lib/format';

/** The fields Claude extracted, with the uncertain ones marked */
export function InvoiceFields({ invoice }: { invoice: Invoice }) {
  const unsure = new Set<string>(invoice.uncertainFields);
  const c = invoice.currency;
  const rows: [field: string, label: string, value: string][] = [
    ['vendorName', 'Vendor', invoice.vendor.name ?? '—'],
    ['vendorCountry', 'Country', invoice.vendor.country ?? '—'],
    ['vendorTaxId', 'Tax ID', invoice.vendor.taxId ?? '—'],
    ['invoiceNumber', 'Invoice number', invoice.invoiceNumber ?? '—'],
    ['issueDate', 'Issued', date(invoice.issueDate)],
    ['dueDate', 'Due', date(invoice.dueDate)],
    ['currency', 'Currency', c ?? '—'],
    ['subtotal', 'Subtotal', money(invoice.subtotal, c)],
    ['discount', 'Discount', invoice.discount ? money(invoice.discount, c) : '—'],
    ['taxAmount', `Tax${invoice.taxRate !== null ? ` (${invoice.taxRate}%)` : ''}`, money(invoice.taxAmount, c)],
    ['total', 'Total', money(invoice.total, c)],
    ['paymentDetails', 'Payment details', invoice.paymentDetails ?? '—'],
  ];
  return (
    <div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 text-sm">
        {rows.map(([field, label, value]) => (
          <div key={field} className="contents">
            <dt className="text-ink-500">{label}</dt>
            <dd className={`min-w-0 break-words ${field === 'total' ? 'font-semibold' : ''}`}>
              {value}
              {unsure.has(field) && (
                <span className="ml-2 rounded bg-amber-50 px-1.5 py-px text-[11px] text-amber-800">unsure</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {invoice.lineItems.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs text-ink-500">
                <th className="py-1.5 pr-3 font-medium">Line item</th>
                <th className="py-1.5 pr-3 text-right font-medium">Qty</th>
                <th className="py-1.5 pr-3 text-right font-medium">Price</th>
                <th className="py-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((li, i) => (
                <tr key={i} className="border-b border-ink-100">
                  <td className="py-1.5 pr-3">{li.description}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{li.quantity ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{money(li.unitPrice, c)}</td>
                  <td className="py-1.5 text-right tabular-nums">{money(li.amount, c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
