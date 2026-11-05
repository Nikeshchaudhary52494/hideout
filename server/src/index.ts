import { config } from './config.ts';
import { createServer } from './server.ts';
import { createNudger } from './push.ts';
import { createMemoryStore } from './store/memory.ts';
import { createPostgresStore } from './store/postgres.ts';

const store = config.db ? await createPostgresStore(config.db) : createMemoryStore();
if (!config.db) console.warn('No DB_CONNECTION_STRING: users and messages are kept in memory only.');

const server = await createServer({ ...config, store, nudger: createNudger({ pushUrl: config.pushUrl }) });
console.log(`chat server on :${server.port} (${config.db ? 'postgres' : 'memory'} store)`);

const shutdown = async () => {
  await server.close();
  await store.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
