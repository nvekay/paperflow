import { createHash } from 'node:crypto';
import type { Invoice } from './schema.js';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const SUPPORTED_TYPES: readonly string[] = ['application/pdf', ...IMAGE_TYPES];

export interface DocumentInput {
  bytes: Uint8Array;
  mimeType: string;
  filename?: string;
}

export interface LlmUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
}

export interface ExtractResult {
  invoice: Invoice;
  /** One entry per model call; a cascade that escalated has two */
  usage: LlmUsage[];
  escalated: boolean;
}

export interface Extractor {
  extract(doc: DocumentInput): Promise<ExtractResult>;
}

export class UnsupportedDocumentError extends Error {
  constructor(readonly mimeType: string) {
    super(`Unsupported file type ${mimeType}; send a PDF, JPEG, PNG, WebP or GIF`);
  }
}

export const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export const totalCost = (usage: LlmUsage[]) => usage.reduce((s, u) => s + u.costUsd, 0);
