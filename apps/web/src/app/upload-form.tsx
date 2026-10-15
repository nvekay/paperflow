'use client';

import { FileUp } from 'lucide-react';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { submitUpload, type ActionState } from './actions';

/** Drop zone for one invoice; the server action stores it, starts the workflow and opens the live view */
export function UploadForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitUpload, {});
  const [name, setName] = useState<string | null>(null);
  return (
    <form action={action} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 px-4 py-10 text-center transition-colors hover:border-accent/50 hover:bg-accent-soft/40">
        <FileUp className="size-7 text-accent" />
        <span className="text-sm font-medium">{name ?? 'Choose an invoice'}</span>
        <span className="text-xs text-ink-500">PDF, scan or phone photo · up to 4 MB</span>
        <input
          type="file"
          name="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => setName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
      {state.error && <p className="mt-3 text-sm text-red-700">{state.error}</p>}
      <Button type="submit" variant="primary" className="mt-4 w-full" loading={pending} disabled={!name}>
        Process invoice
      </Button>
    </form>
  );
}
