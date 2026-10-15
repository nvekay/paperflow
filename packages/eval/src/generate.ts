// Renders the synthetic dataset: PDFs, image-only "scanned" PDFs and phone "photos", plus labels.json with the
// values printed on each document. The output is committed, so the eval never needs a browser.
//   pnpm --filter @paperflow/eval generate
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright';
import sharp from 'sharp';
import { CASES, type CaseSpec } from './cases.js';
import { fileOf, labelOf } from './labels.js';
import { footerTemplate, renderHtml } from './render.js';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'dataset');

/** A4 at 96 dpi; screenshots use twice the density, like a 200 dpi scan */
const A4 = { width: 794, height: 1123 };

async function renderPdf(browser: Browser, c: CaseSpec) {
  const page = await browser.newPage();
  await page.setContent(renderHtml(c), { waitUntil: 'load' });
  const multiPage = c.lines.length > 15;
  const pdf = await page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: multiPage,
    headerTemplate: '<div></div>',
    footerTemplate: footerTemplate(c.vendor.labels.page),
  });
  await page.close();
  return pdf;
}

async function screenshot(browser: Browser, c: CaseSpec) {
  const context = await browser.newContext({ viewport: A4, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.setContent(renderHtml(c), { waitUntil: 'load' });
  const png = await page.screenshot({ fullPage: true });
  await context.close();
  return png;
}

/** Deterministic grain so every run produces the same files */
function noise(width: number, height: number, seed: number, alpha: number) {
  const buf = Buffer.alloc(width * height * 4);
  let s = seed;
  for (let i = 0; i < width * height; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const v = s % 256;
    buf[i * 4] = buf[i * 4 + 1] = buf[i * 4 + 2] = v;
    buf[i * 4 + 3] = alpha;
  }
  return buf;
}

/** Grayscale, slightly tilted, grainy and low-quality: what an office scanner produces */
async function toScan(png: Buffer, seed: number) {
  const tilted = await sharp(png).grayscale().rotate(1.3, { background: '#ffffff' }).toBuffer();
  const { width, height } = await sharp(tilted).metadata();
  return sharp(tilted)
    .composite([{ input: noise(width, height, seed, 28), raw: { width, height, channels: 4 } }])
    .linear(1.15, -18)
    .blur(0.6)
    .jpeg({ quality: 50 })
    .toBuffer();
}

/** Paper on a desk, shot at a slight angle in uneven light */
async function toPhoto(png: Buffer) {
  const turned = await sharp(png)
    .rotate(-2.4, { background: '#cfc6b4' })
    .extend({ top: 90, bottom: 90, left: 90, right: 90, background: '#cfc6b4' })
    .toBuffer();
  const { width, height } = await sharp(turned).metadata();
  const shade = Buffer.from(
    `<svg width="${width}" height="${height}"><defs><radialGradient id="g" cx="40%" cy="35%" r="80%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.38"/>
    </radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
  );
  // sharp resizes before compositing within one pipeline, so shade first and shrink in a second pass
  const shaded = await sharp(turned)
    .composite([{ input: shade }])
    .png()
    .toBuffer();
  return sharp(shaded)
    .modulate({ brightness: 0.96, saturation: 0.9 })
    .blur(0.7)
    .resize({ width: 1500 })
    .jpeg({ quality: 70 })
    .toBuffer();
}

/** Wraps a scanned image into a single-page PDF with no text layer, like a scanner's PDF output */
async function imagePdf(browser: Browser, jpeg: Buffer) {
  const page = await browser.newPage();
  await page.setContent(
    `<html><body style="margin:0"><img src="data:image/jpeg;base64,${jpeg.toString('base64')}" style="width:100%;display:block"></body></html>`,
    { waitUntil: 'load' },
  );
  const pdf = await page.pdf({ format: 'A4', margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  await page.close();
  return pdf;
}

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [i, c] of CASES.entries()) {
    let bytes: Buffer;
    if (c.format === 'pdf') bytes = Buffer.from(await renderPdf(browser, c));
    else {
      const png = await screenshot(browser, c);
      bytes =
        c.format === 'scan_pdf' ? Buffer.from(await imagePdf(browser, await toScan(png, 7 + i))) : await toPhoto(png);
    }
    await writeFile(join(out, fileOf(c)), bytes);
    console.log(`${fileOf(c).padEnd(28)} ${(bytes.length / 1024).toFixed(0).padStart(5)} KB`);
  }
} finally {
  await browser.close();
}

const labels = CASES.map(labelOf);
await writeFile(join(out, 'labels.json'), `${JSON.stringify(labels, null, 2)}\n`);
const review = labels.filter((l) => l.expectedRoute === 'review').length;
console.log(`\n${labels.length} documents, ${labels.length - review} expected auto-approve, ${review} expected review`);
