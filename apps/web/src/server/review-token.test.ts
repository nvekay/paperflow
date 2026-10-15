import { describe, expect, it } from 'vitest';
import { createReviewToken, verifyReviewToken } from './review-token';

const secret = 'test-secret-0123456789';
const now = Date.UTC(2026, 9, 15);

describe('review tokens', () => {
  it('round-trips the document id', () => {
    const token = createReviewToken('doc_abc', secret, now);
    expect(verifyReviewToken(token, secret, now)).toBe('doc_abc');
  });

  it('rejects tampered, foreign and expired tokens', () => {
    const token = createReviewToken('doc_abc', secret, now);
    const [payload, sig] = token.split('.');
    const forged = `${Buffer.from(Buffer.from(payload!, 'base64url').toString().replace('abc', 'xyz')).toString('base64url')}.${sig}`;
    expect(verifyReviewToken(forged, secret, now)).toBeNull();
    expect(verifyReviewToken(token, 'another-secret-0123456', now)).toBeNull();
    expect(verifyReviewToken(token, secret, now + 8 * 86_400_000)).toBeNull();
    expect(verifyReviewToken('garbage', secret, now)).toBeNull();
  });
});
