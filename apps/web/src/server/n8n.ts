import 'server-only';
import { env } from './env';

export class WorkflowUnavailableError extends Error {}

/** Starts the intake workflow for a document; the webhook answers right away and the workflow runs on in n8n */
export async function startIntake(documentId: string) {
  const e = env();
  let res: Response;
  try {
    res = await fetch(e.N8N_INTAKE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-paperflow-secret': e.N8N_WEBHOOK_SECRET },
      body: JSON.stringify({ documentId }),
      // A free Render instance that fell asleep takes up to a minute to wake
      signal: AbortSignal.timeout(75_000),
    });
  } catch (err) {
    throw new WorkflowUnavailableError(`n8n did not respond: ${String(err)}`);
  }
  if (!res.ok) throw new WorkflowUnavailableError(`n8n answered ${res.status}`);
}

/** Continues a workflow that waits for a review, through the resume URL n8n handed over */
export async function resumeWorkflow(resumeUrl: string, body: unknown) {
  const res = await fetch(resumeUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new WorkflowUnavailableError(`n8n answered ${res.status} to the review`);
}
