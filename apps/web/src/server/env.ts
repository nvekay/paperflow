import 'server-only';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  /** Public URL of this app, used in review links sent to Slack */
  WEB_URL: z.string().url().default('http://localhost:3000'),
  /** n8n calls the app's API with this bearer token */
  PAPERFLOW_API_KEY: z.string().min(16),
  /** The intake workflow's production webhook and the header secret it checks */
  N8N_WEBHOOK_URL: z.string().url(),
  N8N_WEBHOOK_SECRET: z.string().min(16),
  /** Signs review links */
  REVIEW_SECRET: z.string().min(16),
  ANTHROPIC_API_KEY: z.string().optional(),
  EXTRACT_MODEL: z.string().default('claude-haiku-5-5'),
  FALLBACK_MODEL: z.string().default('claude-sonnet-5-5'),
  /** Public read-only link to the Google Sheet the workflow writes to */
  SHEET_URL: z.string().url().optional(),
  DEMO_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(10),
  DEMO_LIMIT_PER_DAY: z.coerce.number().int().positive().default(300),
  /** Vercel sends it to cron routes */
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parsed on first use so builds work without runtime secrets */
export function env(): Env {
  // An empty line in .env (SHEET_URL=) means "not set"
  cached ??= schema.parse(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')));
  return cached;
}
