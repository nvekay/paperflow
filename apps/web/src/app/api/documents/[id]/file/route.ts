import { visitorId } from '@/server/auth';
import { getFile } from '@/server/documents';
import { env } from '@/server/env';
import { verifyReviewToken } from '@/server/review-token';

/** The original file, for the visitor who uploaded it or a reviewer holding a valid review link */
export async function GET(request: Request, ctx: RouteContext<'/api/documents/[id]/file'>) {
  const { id } = await ctx.params;
  const token = new URL(request.url).searchParams.get('token');
  const file = await getFile(id);
  const allowed =
    file && (file.visitorId === (await visitorId()) || (token && verifyReviewToken(token, env().REVIEW_SECRET) === id));
  if (!file || !allowed) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.file), {
    headers: {
      'content-type': file.mimeType,
      'content-disposition': `inline; filename="${encodeURIComponent(file.filename)}"`,
      'cache-control': 'private, max-age=600',
      'x-content-type-options': 'nosniff',
    },
  });
}
