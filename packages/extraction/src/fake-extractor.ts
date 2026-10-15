import type { DocumentInput, ExtractResult, Extractor } from './extractor.js';
import type { Invoice } from './schema.js';

export const SAMPLE_INVOICE: Invoice = {
  isInvoice: true,
  vendor: { name: 'Acme Cloud Services Ltd', country: 'GB', taxId: 'GB123456789' },
  invoiceNumber: 'INV-1042',
  issueDate: '2026-10-01',
  dueDate: '2026-10-31',
  currency: 'GBP',
  lineItems: [
    { description: 'Cloud hosting, October', quantity: 1, unitPrice: 420, amount: 420 },
    { description: 'Support hours', quantity: 3, unitPrice: 60, amount: 180 },
  ],
  subtotal: 600,
  discount: null,
  taxRate: 20,
  taxAmount: 120,
  total: 720,
  paymentDetails: 'IBAN GB29 NWBK 6016 1331 9268 19',
  uncertainFields: [],
  suspiciousInstructions: false,
  notes: null,
};

/**
 * Keyless stand-in for local development and tests: returns a known answer for a document (by file name or
 * hash, decided by the lookup) and a fixed sample otherwise. Costs nothing and never calls a model.
 */
export class FakeExtractor implements Extractor {
  constructor(
    private readonly lookup: (doc: DocumentInput) => Invoice | undefined = () => undefined,
    private readonly model = 'fake',
  ) {}

  async extract(doc: DocumentInput): Promise<ExtractResult> {
    return {
      invoice: structuredClone(this.lookup(doc) ?? SAMPLE_INVOICE),
      usage: [{ model: this.model, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 }],
      escalated: false,
    };
  }
}
