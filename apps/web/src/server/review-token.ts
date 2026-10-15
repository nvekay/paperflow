import { createHmac, timingSafeEqual } from 'node:crypto';

const DAY = 86_400;

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url');
const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest();

/**
 * A review link that needs no login: the document id and an expiry, signed with the server's secret.
 * Whoever has the link can review that one document until it expires.
 */
export function createReviewToken(documentId: string, secret: string, now = Date.now(), ttlDays = 7) {
  const payload = `${documentId}.${Math.floor(now / 1000) + ttlDays * DAY}`;
  return `${b64(payload)}.${b64(sign(payload, secret))}`;
}

/** The document id the token was issued for, or null when it is forged, malformed or expired */
export function verifyReviewToken(token: string, secret: string, now = Date.now()): string | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const payload = Buffer.from(encoded, 'base64url').toString();
  const expected = sign(payload, secret);
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const dot = payload.lastIndexOf('.');
  const exp = Number(payload.slice(dot + 1));
  if (dot <= 0 || !Number.isFinite(exp) || exp * 1000 < now) return null;
  return payload.slice(0, dot);
}
