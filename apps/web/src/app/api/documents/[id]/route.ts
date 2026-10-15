import { isWorkflow, visitorId } from '@/server/auth';
import { getDocument, listEvents } from '@/server/documents';
import { documentView } from '@/server/view';

/** Status and timeline of one document, for the n8n workflow (API key) or the visitor who uploaded it (cookie) */
export async function GET(request: Request, ctx: RouteContext<'/api/documents/[id]'>) {
  const { id } = await ctx.params;
  const doc = await getDocument(id);
  const allowed = isWorkflow(request) || (doc && doc.visitorId === (await visitorId()));
  if (!doc || !allowed) return Response.json({ error: 'Document not found' }, { status: 404 });
  return Response.json(documentView(doc, await listEvents(id)), { headers: { 'cache-control': 'no-store' } });
}
