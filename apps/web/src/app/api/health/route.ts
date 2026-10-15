import { isWorkflow } from '@/server/auth';

/** Lets n8n test the "Paperflow API" credential: answers 200 only for the right API key */
export async function GET(request: Request) {
  if (!isWorkflow(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({ ok: true });
}
