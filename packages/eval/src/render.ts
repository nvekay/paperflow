import type { CaseSpec } from './cases.js';
import { CUSTOMER, formatMoney, formatNumber, type Theme } from './vendors.js';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const THEMES: Record<Theme, string> = {
  modern: `
    header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid var(--accent); padding-bottom: 14px; }
    h1 { font-size: 30px; color: var(--accent); margin: 0; letter-spacing: -0.5px; }
    thead th { background: var(--accent); color: #fff; }
    .totals .grand { background: var(--accent); color: #fff; }`,
  classic: `
    header { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 26px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 2px; }
    thead th { border-top: 2px solid #111; border-bottom: 1px solid #111; }
    .totals .grand { border-top: 2px solid #111; border-bottom: 3px double #111; }`,
  minimal: `
    header { display: flex; justify-content: space-between; }
    h1 { font-size: 22px; font-weight: 600; margin: 0; }
    thead th { border-bottom: 1px solid #999; color: #555; font-weight: 500; }
    .totals .grand { font-size: 15px; }`,
};

/** One invoice, quote or receipt as a printable HTML page */
export function renderHtml(c: CaseSpec): string {
  const v = c.vendor;
  const l = v.labels;
  const title = c.docType === 'quote' ? l.quote : c.docType === 'receipt' ? l.receipt : l.invoice;
  const secondDate =
    c.docType === 'quote'
      ? [l.validUntil, v.date(addDays(c.issueDate, 30))]
      : c.docType === 'receipt'
        ? [l.paidOn, v.date(c.issueDate)]
        : c.dueDate
          ? [l.due, v.date(c.dueDate)]
          : null;

  const rows = c.lines
    .map(
      (li) => `<tr>
        <td>${esc(li.description)}</td>
        <td class="num">${li.quantity}</td>
        <td class="num">${formatNumber(v, li.unitPrice)}</td>
        <td class="num">${formatNumber(v, li.amount)}</td>
      </tr>`,
    )
    .join('');

  const totals = [
    [l.subtotal, formatMoney(v, c.subtotal)],
    c.discount !== null ? [l.discount, `−${formatMoney(v, c.discount)}`] : null,
    c.taxRate !== null && c.taxAmount !== null
      ? [`${l.tax} ${c.taxRate.toLocaleString(v.locale)}%`, formatMoney(v, c.taxAmount)]
      : null,
  ]
    .filter((r): r is string[] => r !== null)
    .map(([k, val]) => `<tr><td>${esc(k!)}</td><td class="num">${val}</td></tr>`)
    .join('');

  const injection = c.injection
    ? c.injection.hidden
      ? `<div style="color:#ffffff;font-size:3px;line-height:3px">${esc(c.injection.text)}</div>`
      : `<div class="note"><strong>Note:</strong> ${esc(c.injection.text)}</div>`
    : '';

  return `<!doctype html>
<html lang="${v.locale}">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  /* Screenshots for scans and photos have no print margins */
  @media screen { body { padding: 56px 52px; background: #fff; } }
  :root { --accent: ${v.accent}; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Segoe UI', 'Yu Gothic UI', 'Meiryo', 'Noto Sans', Arial, sans-serif; font-size: 11px; color: #111; }
  .muted { color: #555; }
  .meta { margin-top: 6px; }
  .meta td { padding: 1px 12px 1px 0; }
  .parties { display: flex; gap: 40px; margin: 22px 0; }
  .parties h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin: 0 0 4px; }
  table.lines { width: 100%; border-collapse: collapse; }
  table.lines th { text-align: left; padding: 7px 8px; font-size: 10px; }
  table.lines td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  table.lines thead { display: table-header-group; }
  table.lines tr { page-break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; }
  table.lines th.num { text-align: right; }
  .totals { margin-left: auto; margin-top: 14px; border-collapse: collapse; min-width: 260px; page-break-inside: avoid; }
  .totals td { padding: 5px 8px; }
  .totals .grand td { font-weight: 700; font-size: 13px; }
  .payment { margin-top: 26px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; page-break-inside: avoid; }
  .note { margin-top: 14px; padding: 8px 10px; border: 1px dashed #999; font-size: 10px; }
  .stamp { display: inline-block; margin-top: 10px; padding: 4px 14px; border: 3px solid #15803d; color: #15803d; font-weight: 800; font-size: 20px; transform: rotate(-8deg); letter-spacing: 3px; }
  ${THEMES[v.theme]}
</style>
</head>
<body>
<header>
  <div>
    <h1>${esc(title)}</h1>
    <table class="meta">
      <tr><td class="muted">${esc(l.number)}</td><td><strong>${esc(c.invoiceNumber)}</strong></td></tr>
      <tr><td class="muted">${esc(l.issued)}</td><td>${esc(v.date(c.issueDate))}</td></tr>
      ${secondDate ? `<tr><td class="muted">${esc(secondDate[0]!)}</td><td>${esc(secondDate[1]!)}</td></tr>` : ''}
    </table>
    ${c.docType === 'receipt' ? '<div class="stamp">PAID</div>' : ''}
  </div>
  <div style="text-align:right">
    <div style="font-size:16px;font-weight:700">${esc(v.name)}</div>
    ${v.address.map((a) => `<div class="muted">${esc(a)}</div>`).join('')}
    <div class="muted">${esc(l.taxId)}: ${esc(v.taxId)}</div>
  </div>
</header>
<section class="parties">
  <div>
    <h3>${esc(l.billTo)}</h3>
    <div><strong>${esc(CUSTOMER.name)}</strong></div>
    ${CUSTOMER.address.map((a) => `<div class="muted">${esc(a)}</div>`).join('')}
  </div>
</section>
<table class="lines">
  <thead><tr><th>${esc(l.description)}</th><th class="num">${esc(l.quantity)}</th><th class="num">${esc(l.unitPrice)}</th><th class="num">${esc(l.amount)}</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<table class="totals">
  ${totals}
  <tr class="grand"><td>${esc(l.total)}</td><td class="num">${formatMoney(v, c.total)}</td></tr>
</table>
${injection}
<div class="payment"><strong>${esc(l.payment)}:</strong> ${esc(v.payment)}</div>
</body>
</html>`;
}

/** Footer with page numbers for multi-page PDFs */
export const footerTemplate = (pageLabel: string) =>
  `<div style="font-size:8px;width:100%;text-align:center;color:#777">${esc(pageLabel)} <span class="pageNumber"></span> / <span class="totalPages"></span></div>`;

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
