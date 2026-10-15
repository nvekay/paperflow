import 'server-only';
import { countSince } from './documents';
import { env } from './env';

/** Caps on the public demo, so nobody can run up the AI bill: per visitor per hour, and for everyone per day */
export async function demoLimitMessage(visitorId: string): Promise<string | null> {
  const e = env();
  const hour = await countSince(new Date(Date.now() - 3_600_000), visitorId);
  if (hour >= e.DEMO_LIMIT_PER_HOUR)
    return `The demo allows ${e.DEMO_LIMIT_PER_HOUR} documents per hour. Please try again later.`;
  const day = await countSince(new Date(Date.now() - 86_400_000));
  if (day >= e.DEMO_LIMIT_PER_DAY) return 'The demo has reached its daily limit. Please come back tomorrow.';
  return null;
}
