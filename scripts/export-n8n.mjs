// Saves the workflows from the local n8n back into n8n/workflows, so changes made in the editor land in git.
//   pnpm n8n:export
// Keeps what defines a workflow and drops what changes on every save (timestamps, versions, ownership).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FILES = { pfIntake00000001: 'intake', pfErrors00000001: 'errors' };
const KEEP = ['id', 'name', 'active', 'isArchived', 'nodes', 'connections', 'settings', 'pinData', 'tags'];

const docker = (...args) => execFileSync('docker', ['compose', ...args], { stdio: ['ignore', 'pipe', 'inherit'] });
const tmp = mkdtempSync(join(tmpdir(), 'paperflow-n8n-'));
try {
  docker('exec', '-T', 'n8n', 'sh', '-c', 'rm -rf /tmp/export && mkdir /tmp/export');
  docker('exec', '-T', 'n8n', 'n8n', 'export:workflow', '--all', '--separate', '--output=/tmp/export/');
  docker('cp', 'n8n:/tmp/export/.', tmp);
  for (const file of readdirSync(tmp)) {
    const wf = JSON.parse(readFileSync(join(tmp, file), 'utf8'));
    const name = FILES[wf.id] ?? wf.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const clean = Object.fromEntries(KEEP.filter((k) => k in wf).map((k) => [k, wf[k]]));
    clean.tags = (clean.tags ?? []).map((t) => ({ id: t.id, name: t.name }));
    writeFileSync(join('n8n', 'workflows', `${name}.json`), JSON.stringify(clean, null, 2) + '\n');
    console.log(`n8n/workflows/${name}.json  ${wf.name}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
