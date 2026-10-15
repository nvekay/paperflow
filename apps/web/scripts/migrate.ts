// Applies the SQL migrations in ./drizzle to DATABASE_URL.
//   pnpm --filter @paperflow/web db:migrate
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { pgConfig } from '../src/server/pg-config';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL');
const pool = new Pool(pgConfig(url));
await migrate(drizzle(pool), { migrationsFolder: join(dirname(fileURLToPath(import.meta.url)), '..', 'drizzle') });
await pool.end();
console.log('Migrations applied');
