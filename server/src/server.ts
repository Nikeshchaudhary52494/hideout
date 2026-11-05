// Builds the HTTP + WebSocket server. Dependencies are passed in, so tests can start their own.
import type { AddressInfo } from 'node:net';
import express from 'express';
import { attachRelay } from './relay.ts';
import type { Nudger } from './push.ts';
import type { Store } from './store/types.ts';

export type RunningServer = { port: number; close: () => Promise<void> };

/** Starts listening; resolves once ready. Pass port 0 for a random free port. */
export function createServer({ port, key, store, nudger }: { port: number; key: string; store: Store; nudger: Nudger }) {
  const app = express();
  app.get('/', (_req, res) => void res.send('ok')); // health check

  return new Promise<RunningServer>((resolve) => {
    const http = app.listen(port, () => {
      const wss = attachRelay(http, { key, store, nudger });
      resolve({
        port: (http.address() as AddressInfo).port,
        close: async () => {
          for (const c of wss.clients) c.terminate();
          wss.close();
          http.close();
        },
      });
    });
  });
}
