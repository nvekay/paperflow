import { describe, expect, it } from 'vitest';
import { CascadeExtractor } from './cascade.js';
import { documentBlock } from './claude-extractor.js';
import { UnsupportedDocumentError, sha256, totalCost, type DocumentInput } from './extractor.js';
import { FakeExtractor, SAMPLE_INVOICE } from './fake-extractor.js';

const doc = (mimeType: string): DocumentInput => ({ bytes: new TextEncoder().encode('%PDF-1.7'), mimeType });

describe('documentBlock', () => {
  it('sends PDFs as document blocks and photos as image blocks', () => {
    expect(documentBlock(doc('application/pdf'))).toMatchObject({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0xLjc=' },
    });
    expect(documentBlock(doc('image/jpeg'))).toMatchObject({ type: 'image', source: { media_type: 'image/jpeg' } });
  });

  it('rejects other file types', () => {
    expect(() => documentBlock(doc('application/zip'))).toThrow(UnsupportedDocumentError);
  });
});

describe('CascadeExtractor', () => {
  const today = () => new Date('2026-10-15T12:00:00Z');

  it('keeps a reliable first reading', async () => {
    const cascade = new CascadeExtractor(
      new FakeExtractor(undefined, 'cheap'),
      new FakeExtractor(undefined, 'strong'),
      today,
    );
    const r = await cascade.extract(doc('application/pdf'));
    expect(r.escalated).toBe(false);
    expect(r.usage.map((u) => u.model)).toEqual(['cheap']);
  });

  it('asks the stronger model when the numbers do not add up', async () => {
    const misread = new FakeExtractor(() => ({ ...SAMPLE_INVOICE, total: 72 }), 'cheap');
    const cascade = new CascadeExtractor(misread, new FakeExtractor(undefined, 'strong'), today);
    const r = await cascade.extract(doc('application/pdf'));
    expect(r.escalated).toBe(true);
    expect(r.invoice.total).toBe(720);
    expect(r.usage.map((u) => u.model)).toEqual(['cheap', 'strong']);
    expect(totalCost(r.usage)).toBe(0);
  });
});

describe('sha256', () => {
  it('hashes file bytes', () => {
    expect(sha256(new TextEncoder().encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
