import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { visitorId } from '@/server/auth';
import { getDocument, listEvents } from '@/server/documents';
import { env } from '@/server/env';
import { documentView } from '@/server/view';
import { LiveDocument } from './live-document';

export const metadata: Metadata = { title: 'Invoice' };

export default async function DocumentPage({ params }: PageProps<'/documents/[id]'>) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc || doc.visitorId !== (await visitorId())) notFound();
  return <LiveDocument initial={documentView(doc, await listEvents(id))} sheetUrl={env().SHEET_URL ?? null} />;
}
