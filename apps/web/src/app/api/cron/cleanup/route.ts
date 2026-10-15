import { bearerMatches } from '@/server/auth';
import { deleteOlderThan } from '@/server/documents';
import { env } from '@/server/env';

/** Daily Vercel cron: the public demo keeps uploaded invoices for 72 hours */
export async function GET(request: Request) {
  if (!bearerMatches(request, env().CRON_SECRET)) return new Response('Unauthorized', { status: 401 });
  const deleted = await deleteOlderThan(new Date(Date.now() - 72 * 3_600_000));
  return Response.json({ deleted });
}
