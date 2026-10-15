import 'server-only';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from './env';
import { pgConfig } from './pg-config';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

// One small pool per server instance; dev reloads reuse it instead of opening new connections
const globalForDb = globalThis as unknown as { paperflowDb?: Db };

export function db(): Db {
  globalForDb.paperflowDb ??= drizzle(new Pool(pgConfig(env().DATABASE_URL, { max: 3 })), { schema });
  return globalForDb.paperflowDb;
}
