import { z } from 'zod';
import { isWorkflow } from '@/server/auth';
import { addEvent, getDocument, transition, updateDocument } from '@/server/documents';

const body = z.object({
  step: z.string().min(1).max(60),
  status: z.enum(['done', 'failed', 'waiting', 'info']).default('info'),
  message: z.string().min(1).max(500),
  data: z.record(z.string(), z.unknown()).optional(),
});

/**
 * The workflow reports its steps here, so the demo page can show what n8n is doing. A few steps also move the
 * document's status: waiting for review (with n8n's resume URL), recorded in Sheets, rejected, failed.
 */
export async function POST(request: Request, ctx: RouteContext<'/api/documents/[id]/events'>) {
  if (!isWorkflow(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Send {step, status, message, data?}' }, { status: 422 });
  if (!(await getDocument(id))) return Response.json({ error: 'Document not found' }, { status: 404 });

  const { step, status, message } = parsed.data;
  // The resume URL is a secret capability: stored on the document, never written to the visible timeline
  const { resumeUrl, ...data } = parsed.data.data ?? {};

  switch (step) {
    case 'review_requested':
      if (typeof resumeUrl !== 'string' || !URL.canParse(resumeUrl)) {
        return Response.json({ error: 'review_requested needs data.resumeUrl' }, { status: 422 });
      }
      await updateDocument(id, { resumeUrl });
      break;
    case 'recorded':
      await transition(id, ['approved', 'needs_review'], 'recorded', {
        sheetRow: typeof data.sheetRow === 'string' ? data.sheetRow : null,
        resumeUrl: null,
      });
      break;
    case 'rejected':
      await transition(id, ['needs_review', 'approved'], 'rejected', { resumeUrl: null });
      break;
    case 'failed':
      await transition(id, ['received', 'extracting', 'approved', 'needs_review'], 'failed', { resumeUrl: null });
      break;
  }

  await addEvent(id, 'n8n', step, status, message, Object.keys(data).length ? data : undefined);
  return Response.json({ ok: true });
}
