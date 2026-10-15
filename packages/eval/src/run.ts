// Measures extraction quality and cost on the synthetic dataset with real models.
//   pnpm --filter @paperflow/eval eval                         # haiku, sonnet and the cascade
//   pnpm --filter @paperflow/eval eval -- --configs=cascade    # one configuration
//   ONLY=lumen-photo,maple-scan pnpm --filter @paperflow/eval eval
// Needs ANTHROPIC_API_KEY in the repo's .env; --configs=fake checks the pipeline for free.
import {
  CascadeExtractor,
  ClaudeExtractor,
  FakeExtractor,
  decideRoute,
  runChecks,
  totalCost,
  type ExtractResult,
  type Extractor,
} from '@paperflow/extraction';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES, type Label } from './cases.js';
import { GRADED_FIELDS, gradeInvoice, type Grade } from './grade.js';
import { EVAL_TODAY, expectedInvoice } from './labels.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const labels = JSON.parse(await readFile(join(root, 'dataset', 'labels.json'), 'utf8')) as Label[];
const only = process.env.ONLY?.split(',');
const selected = only ? labels.filter((l) => only.includes(l.id)) : labels;

const HAIKU = process.env.EXTRACT_MODEL ?? 'claude-haiku-5-5';
const SONNET = process.env.FALLBACK_MODEL ?? 'claude-sonnet-5-5';

function extractorFor(name: string): Extractor {
  if (name === 'fake') return new FakeExtractor((doc) => {
    const c = CASES.find((x) => doc.filename?.startsWith(x.id));
    return c && expectedInvoice(c);
  }); // prettier-ignore
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Set ANTHROPIC_API_KEY in .env, or run with --configs=fake');
  if (name === 'haiku') return new ClaudeExtractor(key, HAIKU);
  if (name === 'sonnet') return new ClaudeExtractor(key, SONNET);
  if (name === 'cascade')
    return new CascadeExtractor(new ClaudeExtractor(key, HAIKU), new ClaudeExtractor(key, SONNET), () => EVAL_TODAY);
  throw new Error(`Unknown config ${name}; use haiku, sonnet, cascade or fake`);
}

interface DocResult {
  id: string;
  kind: Label['kind'];
  ms: number;
  costUsd: number;
  escalated: boolean;
  models: string[];
  grade?: Grade;
  reasons?: string[];
  error?: string;
}

async function runDoc(extractor: Extractor, label: Label): Promise<DocResult> {
  const bytes = await readFile(join(root, 'dataset', label.file));
  const started = Date.now();
  try {
    const r: ExtractResult = await extractor.extract({ bytes, mimeType: label.mimeType, filename: label.file });
    const decision = decideRoute(r.invoice, runChecks(r.invoice, { today: EVAL_TODAY }));
    return {
      id: label.id,
      kind: label.kind,
      ms: Date.now() - started,
      costUsd: totalCost(r.usage),
      escalated: r.escalated,
      models: r.usage.map((u) => u.model),
      grade: gradeInvoice(label, r.invoice, decision),
      reasons: decision.reasons,
    };
  } catch (err) {
    return {
      id: label.id,
      kind: label.kind,
      ms: Date.now() - started,
      costUsd: 0,
      escalated: false,
      models: [],
      error: String(err),
    };
  }
}

async function runConfig(name: string) {
  const extractor = extractorFor(name);
  const results: DocResult[] = [];
  // A few documents at a time keeps within rate limits
  for (let i = 0; i < selected.length; i += 4) {
    results.push(...(await Promise.all(selected.slice(i, i + 4).map((l) => runDoc(extractor, l)))));
    process.stdout.write(`${name}: ${results.length}/${selected.length}\r`);
  }
  process.stdout.write('\n');
  return results;
}

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '—');
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;

function summarize(name: string, results: DocResult[]) {
  const graded = results.filter((r) => r.grade);
  const fieldRows = GRADED_FIELDS.map((f) => {
    const scored = graded.filter((r) => r.grade!.fields[f] !== undefined);
    return { field: f, right: scored.filter((r) => r.grade!.fields[f]).length, total: scored.length };
  });
  const perfect = graded.filter((r) => r.grade!.mismatches.length === 0).length;
  const routeOk = graded.filter((r) => r.grade!.route.ok).length;
  const falseApprove = graded.filter(
    (r) => r.grade!.route.expected === 'review' && r.grade!.route.got === 'auto_approve',
  );
  const missedApprove = graded.filter(
    (r) => r.grade!.route.expected === 'auto_approve' && r.grade!.route.got === 'review',
  );
  const ambiguous = graded.filter((r) => r.grade!.flaggedAmbiguity !== undefined);
  const cost = results.reduce((s, r) => s + r.costUsd, 0);
  return {
    name,
    docs: results.length,
    errors: results.filter((r) => r.error).length,
    fieldRows,
    perfect,
    routeOk,
    falseApprove: falseApprove.map((r) => r.id),
    missedApprove: missedApprove.map((r) => r.id),
    ambiguityFlagged: `${ambiguous.filter((r) => r.grade!.flaggedAmbiguity).length}/${ambiguous.length}`,
    escalated: results.filter((r) => r.escalated).length,
    costUsd: cost,
    costPerDoc: results.length ? cost / results.length : 0,
    p50ms: median(results.map((r) => r.ms)),
  };
}

const configs = (process.argv.find((a) => a.startsWith('--configs='))?.slice(10) ?? 'haiku,sonnet,cascade').split(',');
console.log(`Evaluating ${selected.length} documents with ${configs.join(', ')}\n`);

const runs: Record<string, DocResult[]> = {};
for (const c of configs) runs[c] = await runConfig(c);
const summaries = configs.map((c) => summarize(c, runs[c]!));

// Markdown report: one column per configuration
const col = (f: (s: ReturnType<typeof summarize>) => string) => summaries.map(f).join(' | ');
const lines = [
  `# Extraction eval`,
  '',
  `${selected.length} synthetic documents (PDFs, scans, phone photos; 7 vendors, 7 currencies, 6 languages), run ${new Date().toISOString().slice(0, 10)}.`,
  '',
  `| Metric | ${configs.join(' | ')} |`,
  `| --- | ${configs.map(() => '---').join(' | ')} |`,
  `| Documents with every field right | ${col((s) => `${s.perfect}/${s.docs - s.errors}`)} |`,
  `| Correct route (auto-approve vs review) | ${col((s) => `${s.routeOk}/${s.docs - s.errors}`)} |`,
  `| **Wrongly auto-approved** | ${col((s) => `**${s.falseApprove.length}**`)} |`,
  `| Sent to review unnecessarily | ${col((s) => String(s.missedApprove.length))} |`,
  `| Ambiguous values flagged | ${col((s) => s.ambiguityFlagged)} |`,
  `| Re-read by the stronger model | ${col((s) => String(s.escalated))} |`,
  `| Cost per document | ${col((s) => `$${s.costPerDoc.toFixed(4)}`)} |`,
  `| Median time per document | ${col((s) => `${(s.p50ms / 1000).toFixed(1)} s`)} |`,
  `| Errors | ${col((s) => String(s.errors))} |`,
  '',
  `| Field accuracy | ${configs.join(' | ')} |`,
  `| --- | ${configs.map(() => '---').join(' | ')} |`,
  ...GRADED_FIELDS.map((f) => `| ${f} | ${col((s) => { const r = s.fieldRows.find((x) => x.field === f)!; return `${pct(r.right, r.total)} (${r.right}/${r.total})`; })} |`), // prettier-ignore
  '',
  '## Mistakes',
  '',
  ...configs.flatMap((c) => {
    const wrong = runs[c]!.filter((r) => r.error || r.grade!.mismatches.length || !r.grade!.route.ok);
    return [
      `### ${c}`,
      '',
      ...(wrong.length
        ? wrong.map((r) =>
            r.error
              ? `- ${r.id}: error ${r.error}`
              : `- ${r.id}: ${[...r.grade!.mismatches, ...(r.grade!.route.ok ? [] : [`route ${r.grade!.route.expected} → ${r.grade!.route.got}`])].join('; ')}`,
          )
        : ['None.']),
      '',
    ];
  }),
];

const outDir = join(root, 'results');
await mkdir(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
await writeFile(join(outDir, `${stamp}.json`), JSON.stringify({ configs, summaries, runs }, null, 2));
if (!configs.includes('fake')) await writeFile(join(root, 'results.md'), `${lines.join('\n')}\n`);
console.log(lines.slice(4, 34).join('\n'));
