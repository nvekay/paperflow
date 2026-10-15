/** Amount in the invoice's currency, falling back to a plain number for unknown codes */
export function money(n: number | null | undefined, currency: string | null | undefined) {
  if (n === null || n === undefined) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency ?? 'USD' }).format(n);
  } catch {
    return `${n.toLocaleString('en-US')} ${currency ?? ''}`.trim();
  }
}

export const usd = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`;

export function date(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** "+3.4 s" relative to the first event */
export function offset(from: string, at: string) {
  const s = (new Date(at).getTime() - new Date(from).getTime()) / 1000;
  return s < 60 ? `+${s.toFixed(1)} s` : `+${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

export const FINAL_STATUSES = ['recorded', 'rejected', 'failed'] as const;
