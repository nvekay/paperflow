import { runChecks } from './checks.js';
import type { DocumentInput, ExtractResult, Extractor } from './extractor.js';
import { needsSecondOpinion } from './route.js';

/**
 * Reads with a cheap model first and asks a stronger one only when the first reading looks unreliable:
 * low confidence, or numbers and dates that do not check out. Both calls are kept in the usage for cost reporting.
 */
export class CascadeExtractor implements Extractor {
  constructor(
    private readonly primary: Extractor,
    private readonly fallback: Extractor,
    private readonly today: () => Date = () => new Date(),
  ) {}

  async extract(doc: DocumentInput): Promise<ExtractResult> {
    const first = await this.primary.extract(doc);
    if (!needsSecondOpinion(first.invoice, runChecks(first.invoice, { today: this.today() }))) return first;
    const second = await this.fallback.extract(doc);
    return { invoice: second.invoice, usage: [...first.usage, ...second.usage], escalated: true };
  }
}
