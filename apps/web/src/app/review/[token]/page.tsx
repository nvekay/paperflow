import { CircleCheck, CircleX, Link2Off } from 'lucide-react';
import type { Metadata } from 'next';
import { ChecksList } from '@/components/checks-list';
import { DocumentPreview } from '@/components/document-preview';
import { StatusBadge } from '@/components/status-badge';
import { getDocument } from '@/server/documents';
import { env } from '@/server/env';
import { verifyReviewToken } from '@/server/review-token';
import { ReviewForm } from './review-form';

export const metadata: Metadata = { title: 'Review invoice', robots: { index: false } };

function Notice({ icon: Icon, title, text }: { icon: typeof Link2Off; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <Icon className="mx-auto size-10 text-ink-300" />
      <h1 className="mt-4 text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-ink-600">{text}</p>
    </div>
  );
}

/** The page a reviewer opens from Slack: no login, the signed link is the permission */
export default async function ReviewPage({ params, searchParams }: PageProps<'/review/[token]'>) {
  const { token } = await params;
  const { done } = await searchParams;
  const id = verifyReviewToken(token, env().REVIEW_SECRET);
  const doc = id ? await getDocument(id) : null;
  if (!doc?.invoice || !doc.decision) {
    return <Notice icon={Link2Off} title="Link not valid" text="This review link is invalid or has expired." />;
  }

  if (doc.status !== 'needs_review' || done) {
    const rejected = doc.status === 'rejected';
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        {rejected ? (
          <CircleX className="mx-auto size-10 text-red-500" />
        ) : (
          <CircleCheck className="mx-auto size-10 text-emerald-600" />
        )}
        <h1 className="mt-4 text-xl font-semibold">
          {done ? 'Thanks, the workflow continues' : 'This invoice has already been reviewed'}
        </h1>
        <p className="mt-2 text-sm text-ink-600">
          {doc.invoice.vendor.name ?? doc.filename} · {doc.invoice.invoiceNumber ?? 'no number'}
        </p>
        <div className="mt-4 flex justify-center">
          <StatusBadge status={doc.status} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium text-accent">Review requested by the n8n workflow</p>
      <h1 className="mt-1 text-2xl font-semibold">{doc.invoice.vendor.name ?? doc.filename}</h1>
      <p className="mt-1 text-sm text-ink-500">{doc.filename}</p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="order-2 lg:order-1">
          <DocumentPreview
            src={`/api/documents/${doc.id}/file?token=${encodeURIComponent(token)}`}
            mimeType={doc.mimeType}
            title={doc.filename}
          />
        </div>
        <div className="order-1 space-y-6 lg:order-2">
          {doc.decision.reasons.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-medium text-amber-900">Why it needs a person</h2>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-amber-900/85">
                {doc.decision.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}
          <ReviewForm token={token} invoice={doc.invoice} />
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
