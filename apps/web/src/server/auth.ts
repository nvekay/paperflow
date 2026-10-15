import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './env';

const VISITOR_COOKIE = 'pf_visitor';

/** Constant-time comparison of a bearer token with a secret */
export function bearerMatches(request: Request, secret: string | undefined) {
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const given = Buffer.from(header.startsWith('Bearer ') ? header.slice(7) : '');
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** n8n authenticates with the shared API key */
export const isWorkflow = (request: Request) => bearerMatches(request, env().PAPERFLOW_API_KEY);

/** Anonymous visitor of the public demo; every document belongs to one visitor (a company, in a real setup) */
export async function visitorId(): Promise<string | undefined> {
  return (await cookies()).get(VISITOR_COOKIE)?.value;
}

/** Sets the visitor cookie on first use; only callable from server actions and route handlers */
export async function ensureVisitorId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value;
  if (existing) return existing;
  const id = randomBytes(12).toString('base64url');
  jar.set(VISITOR_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return id;
}
