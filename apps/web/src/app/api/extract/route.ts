import { DEFAULT_POLICY } from '@paperflow/extraction';
import { z } from 'zod';
import { isWorkflow } from '@/server/auth';
import { DocumentNotFoundError, processDocument } from '@/server/extract';

// A scan that needs the stronger model can take close to a minute
export const maxDuration = 120;

const body = z.object({
  documentId: z.string().min(1),
  policy: z
    .object({
      autoApproveMaxUsd: z.coerce.number().nonnegative().optional(),
      minConfidence: z.enum(['high', 'medium', 'low']).optional(),
    })
    .optional(),
});

/** Called by the n8n workflow: read the document, check it and decide whether a person must review it */
export async function POST(request: Request) {
  if (!isWorkflow(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Send {"documentId": "..."}' }, { status: 422 });

  const { documentId, policy } = parsed.data;
  try {
    const result = await processDocument(documentId, { ...DEFAULT_POLICY, ...policy });
    return Response.json(result);
  } catch (err) {
    if (err instanceof DocumentNotFoundError) return Response.json({ error: 'Document not found' }, { status: 404 });
    // n8n retries 5xx answers; the document's timeline already shows what went wrong
    return Response.json({ error: 'Extraction failed', detail: String(err) }, { status: 502 });
  }
}
