// Runtime settings, from the environment (.env is loaded by the npm scripts).
import { existsSync, readFileSync } from 'node:fs';

export type Config = {
  port: number;
  key: string;
  pushUrl: string;
  db: { url: string; ca?: string } | null; // null = keep everything in memory (dev only)
};

const CA_FILE = new URL('../certs/supabase-ca.crt', import.meta.url); // Supabase's root CA, for verified TLS

function dbConfig(): Config['db'] {
  const url = process.env.DB_CONNECTION_STRING;
  if (!url) return null;
  const password = process.env.DB_PASSWORD;
  return {
    // Supabase hands out the URL with a [YOUR-PASSWORD] placeholder; the password lives in its own variable.
    url: password ? url.replace('[YOUR-PASSWORD]', encodeURIComponent(password)) : url,
    ca: existsSync(CA_FILE) ? readFileSync(CA_FILE, 'utf8') : undefined,
  };
}

export const config: Config = {
  port: Number(process.env.PORT) || 3000,
  key: process.env.CHAT_KEY || 'change-me', // must match KEY in app/src/config.ts
  pushUrl: process.env.PUSH_URL || 'https://exp.host/--/api/v2/push/send',
  db: dbConfig(),
};
