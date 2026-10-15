import {
  ArrowRight,
  FileCheck2,
  FileSpreadsheet,
  MessageSquareMore,
  ScanText,
  ShieldCheck,
  Webhook,
} from 'lucide-react';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';
import { date, money } from '@/lib/format';
import { visitorId } from '@/server/auth';
import { listRecent } from '@/server/documents';
import { env } from '@/server/env';
import { SAMPLES } from '@/server/samples';
import { SampleCard } from './sample-card';
import { UploadForm } from './upload-form';

const STEPS = [
  { icon: Webhook, title: 'n8n receives it', text: 'A webhook starts the intake workflow for every new invoice.' },
  { icon: ScanText, title: 'Claude reads it', text: 'A custom n8n node sends the PDF or photo to Claude, which returns every field in a strict schema.' },
  { icon: ShieldCheck, title: 'Code checks it', text: 'Lines add up, tax matches the rate, dates make sense, no duplicates, no hidden instructions.' },
  { icon: MessageSquareMore, title: 'A person decides', text: 'Doubtful or large invoices wait in Slack for one click: approve, fix or reject.' },
  { icon: FileSpreadsheet, title: 'Data lands in Sheets', text: 'Approved invoices become rows in Google Sheets; nothing is lost if a step fails.' },
]; // prettier-ignore

export default async function Home() {
  const visitor = await visitorId();
  const recent = visitor ? await listRecent(visitor, 8) : [];
  const sheetUrl = env().SHEET_URL;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid gap-10 py-12 md:grid-cols-[1.2fr_1fr] md:items-center md:py-16">
        <div>
          <p className="text-sm font-medium text-accent">n8n + Claude + your own code</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Invoices in, clean data out.</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
            Drop a PDF, a scan or a phone photo of an invoice. An n8n workflow has Claude read it, code checks that the
            numbers add up, and only uncertain invoices wait for a person. Everything else lands in Google Sheets on its
            own.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {sheetUrl && (
              <a href={sheetUrl} className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
                Open the Google Sheet <ArrowRight className="size-4" />
              </a>
            )}
            <Link href="#how" className="inline-flex items-center gap-1.5 text-ink-600 hover:text-ink-900">
              How it works <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
        <UploadForm />
      </section>

      <section className="pb-14">
        <h2 className="text-xl font-semibold">Or try a sample</h2>
        <p className="mt-1 text-sm text-ink-600">
          Fictional invoices from the test set: different countries, languages, scans and photos, and a few traps.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SAMPLES.map((s) => (
            <SampleCard key={s.id} id={s.id} title={s.title} preview={s.preview} expectedRoute={s.expectedRoute} />
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="pb-14">
          <h2 className="text-xl font-semibold">Your documents</h2>
          <ul className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-200">
            {recent.map((d) => (
              <li key={d.id}>
                <Link href={`/documents/${d.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-ink-50">
                  <FileCheck2 className="size-5 shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.invoice?.vendor.name ?? d.filename}</div>
                    <div className="text-xs text-ink-500">
                      {d.invoice?.invoiceNumber ?? '—'} · {date(d.createdAt.toISOString())}
                    </div>
                  </div>
                  <div className="hidden text-sm tabular-nums sm:block">
                    {money(d.invoice?.total, d.invoice?.currency)}
                  </div>
                  <StatusBadge status={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="how" className="scroll-mt-20 border-t border-ink-100 py-14">
        <h2 className="text-xl font-semibold">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-ink-200 p-4">
              <div className="flex items-center gap-2">
                <s.icon className="size-5 text-accent" />
                <span className="font-mono text-xs text-ink-400">0{i + 1}</span>
              </div>
              <div className="mt-3 font-medium">{s.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ink-600">
          The model only reads; deterministic code decides. On a test set of 31 invoices (PDFs, scans and photos in six
          languages) every field was read correctly and no invoice that needed a person was approved automatically, at
          about a tenth of a cent per invoice.
        </p>
      </section>
    </div>
  );
}
