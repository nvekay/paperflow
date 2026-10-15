import { CircleAlert, CircleCheck, Clock, Info } from 'lucide-react';
import { offset } from '@/lib/format';
import type { DocumentView } from '@/server/view';

const SOURCE: Record<string, [label: string, className: string]> = {
  app: ['app', 'bg-ink-100 text-ink-600'],
  n8n: ['n8n', 'bg-[#ffeee9] text-[#c2410c]'],
  person: ['person', 'bg-accent-soft text-accent'],
};

const ICON = {
  done: <CircleCheck className="size-4 text-emerald-600" />,
  failed: <CircleAlert className="size-4 text-red-600" />,
  waiting: <Clock className="size-4 text-amber-600" />,
  info: <Info className="size-4 text-ink-400" />,
};

/** Every step of the document's journey, from the app, the n8n workflow and the reviewer, in order */
export function Timeline({ events, running }: { events: DocumentView['events']; running: boolean }) {
  const start = events[0]?.at;
  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const [label, chip] = SOURCE[e.source] ?? SOURCE.app!;
        const models = Array.isArray(e.data?.models) ? (e.data.models as string[]).join(' → ') : null;
        const cost = typeof e.data?.costUsd === 'number' ? e.data.costUsd : null;
        const failed = Array.isArray(e.data?.failed) ? (e.data.failed as string[]) : [];
        return (
          <li key={e.id} className="flex gap-3">
            <span className="mt-0.5">{ICON[e.status]}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-ink-900">{e.message}</span>
                <span className={`rounded px-1.5 py-px font-mono text-[10px] uppercase ${chip}`}>{label}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-500">
                {start && <span>{offset(start, e.at)}</span>}
                {models && <span className="font-mono">{models}</span>}
                {cost !== null && <span>${cost.toFixed(4)}</span>}
              </div>
              {failed.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
                  {failed.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
      {running && (
        <li className="flex items-center gap-3 text-sm text-ink-500">
          <span className="relative flex size-4 items-center justify-center">
            <span className="absolute size-3 animate-ping rounded-full bg-accent/30" />
            <span className="size-2 rounded-full bg-accent" />
          </span>
          Working…
        </li>
      )}
    </ol>
  );
}
