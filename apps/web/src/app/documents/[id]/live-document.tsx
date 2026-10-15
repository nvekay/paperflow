'use client';

import { ArrowLeft, ExternalLink, MessageSquareMore } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChecksList } from '@/components/checks-list';
import { DocumentPreview } from '@/components/document-preview';
import { InvoiceFields } from '@/components/invoice-fields';
import { StatusBadge } from '@/components/status-badge';
import { Timeline } from '@/components/timeline';
import { FINAL_STATUSES, usd } from '@/lib/format';
import type { DocumentView } from '@/server/view';

/** Polls the document while the workflow runs, so the visitor watches n8n's steps arrive */
export function LiveDocument({ initial, sheetUrl }: { initial: DocumentView; sheetUrl: string | null }) {
  const [doc, setDoc] = useState(initial);
  const final = (FINAL_STATUSES as readonly string[]).includes(doc.status);

  useEffect(() => {
    if (final) return;
    // Slower while a person is expected to review, fast while the machines work
    const delay = doc.status === 'needs_review' ? 4000 : 1500;
    let cancelled = false;
    const poll = async () => {
      const res = await fetch(`/api/documents/${doc.id}`, { cache: 'no-store' }).catch(() => null);
      const next = res?.ok ? ((await res.json()) as DocumentView) : null;
      // After a failed request a fresh copy of the same state re-runs this effect, which schedules the next try
      if (!cancelled) setDoc((prev) => next ?? { ...prev });
    };
    const timer = setTimeout(() => void poll(), delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [doc, final]);

  const running = !final && doc.status !== 'needs_review';
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft className="size-4" /> All documents
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{doc.invoice?.vendor.name ?? doc.filename}</h1>
        <StatusBadge status={doc.status} />
      </div>
      <p className="mt-1 text-sm text-ink-500">
        {doc.filename}
        {doc.invoice?.invoiceNumber && ` · ${doc.invoice.invoiceNumber}`}
        {doc.costUsd !== null && ` · AI cost ${usd(doc.costUsd)}`}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="order-2 lg:order-1">
          <DocumentPreview src={`/api/documents/${doc.id}/file`} mimeType={doc.mimeType} title={doc.filename} />
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          {doc.reviewUrl && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 font-medium text-amber-900">
                <MessageSquareMore className="size-4" /> Waiting for a person
              </div>
              <p className="mt-1 text-sm text-amber-900/80">
                The workflow posted this invoice to the reviewers&apos; Slack channel and paused. In the demo you can
                open the same review link here.
              </p>
              <a
                href={doc.reviewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-950"
              >
                Open review page <ExternalLink className="size-3.5" />
              </a>
            </div>
          )}

          {doc.status === 'recorded' && sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 hover:bg-emerald-100"
            >
              Recorded in Google Sheets{doc.sheetRow ? ` (${doc.sheetRow})` : ''}
              <ExternalLink className="size-4" />
            </a>
          )}

          <section>
            <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">Workflow</h2>
            <div className="mt-3">
              <Timeline events={doc.events} running={running} />
            </div>
          </section>

          {doc.decision && doc.decision.reasons.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">Why it needs a person</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
                {doc.decision.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {doc.invoice && (
            <section>
              <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">Extracted by Claude</h2>
              <div className="mt-3">
                <InvoiceFields invoice={doc.invoice} />
              </div>
            </section>
          )}

          {doc.checks && (
            <section>
              <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase">Checked by code</h2>
              <div className="mt-2">
                <ChecksList checks={doc.checks} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
