'use client';

import { useActionState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { submitSample, type ActionState } from './actions';

interface Props {
  id: string;
  title: string;
  preview: string;
  expectedRoute: 'auto_approve' | 'review';
}

/** One click sends a prepared sample document through the same workflow as an upload */
export function SampleCard({ id, title, preview, expectedRoute }: Props) {
  const [state, action, pending] = useActionState<ActionState>(() => submitSample(id), {});
  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="group block w-full overflow-hidden rounded-xl border border-ink-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md disabled:opacity-70"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-ink-50">
          <img src={`/samples/${preview}`} alt="" className="size-full object-cover object-top" loading="lazy" />
          {pending && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Spinner className="size-6 text-accent" />
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="text-sm leading-snug font-medium">{title}</div>
          <div
            className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
              expectedRoute === 'auto_approve' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
            }`}
          >
            {expectedRoute === 'auto_approve' ? 'Should go straight through' : 'Should stop for review'}
          </div>
          {state.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}
        </div>
      </button>
    </form>
  );
}
