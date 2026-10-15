// Copies the built Paperflow node into n8n/nodes, where the n8n image (local and on Hugging Face) picks it up.
//   pnpm n8n:prepare
import { cpSync, rmSync } from 'node:fs';

const from = 'packages/n8n-nodes-paperflow';
const to = 'n8n/nodes/n8n-nodes-paperflow';

rmSync(to, { recursive: true, force: true });
cpSync(`${from}/package.json`, `${to}/package.json`);
cpSync(`${from}/dist`, `${to}/dist`, {
  recursive: true,
  filter: (src) => !/\.(map|d\.ts|tsbuildinfo)$/.test(src),
});
console.log(`Copied the node to ${to}`);
