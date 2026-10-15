import type { DocumentStatus } from '@/server/schema';

const STYLES: Record<DocumentStatus, [label: string, className: string]> = {
  received: ['Received', 'bg-ink-100 text-ink-700'],
  extracting: ['Reading', 'bg-sky-50 text-sky-800'],
  needs_review: ['Needs review', 'bg-amber-50 text-amber-800'],
  approved: ['Approved', 'bg-emerald-50 text-emerald-800'],
  recorded: ['Recorded', 'bg-emerald-600 text-white'],
  rejected: ['Rejected', 'bg-red-50 text-red-800'],
  failed: ['Failed', 'bg-red-600 text-white'],
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const [label, className] = STYLES[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}
