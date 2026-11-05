// The WebSocket relay: authenticates phones, routes events to their recipient, keeps friends lists,
// archives messages and queues events for offline users. All persistence goes through `store`.
import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { CLOSE, MAX_PAYLOAD, parseClientMessage, parseHandshake, type ClientMessage, type ServerMessage } from './protocol.ts';
import type { Nudger } from './push.ts';
import type { Store } from './store/types.ts';

type Deps = { key: string; store: Store; nudger: Nudger };

export function attachRelay(httpServer: Server, { key, store, nudger }: Deps) {
  const wss = new WebSocketServer({ server: httpServer, maxPayload: MAX_PAYLOAD });
  const owner = new Map<WebSocket, string>(); // socket -> userId (a phone may have several sockets)

  const socketsOf = (id: string) => [...owner].filter(([ws, uid]) => uid === id && ws.readyState === WebSocket.OPEN).map(([ws]) => ws);
  const isOnline = (id: string) => socketsOf(id).length > 0;
  const sendTo = (id: string, raw: string) => {
    const targets = socketsOf(id);
    for (const ws of targets) ws.send(raw);
    return targets.length > 0;
  };
  const tell = (ws: WebSocket, msg: ServerMessage) => ws.send(JSON.stringify(msg));
  const broadcast = (msg: ServerMessage) => {
    const raw = JSON.stringify(msg);
    for (const ws of owner.keys()) if (ws.readyState === WebSocket.OPEN) ws.send(raw);
  };
  const sendFriends = async (id: string) => {
    const friends = (await store.friendsOf(id)).map((f) => ({ ...f, online: isOnline(f.id) }));
    sendTo(id, JSON.stringify({ type: 'friends', friends } satisfies ServerMessage));
  };

  // Caches of facts already confirmed in the store, so a chatty conversation doesn't cost a DB round trip
  // per message (Supabase is ~150ms away). Users and friendships are only ever added while running,
  // except friend-remove, which clears its entry below.
  const knownUsers = new Set<string>();
  const knownFriends = new Set<string>(); // "userId>friendId"
  const isKnownUser = async (uid: string) => {
    if (knownUsers.has(uid)) return true;
    const exists = await store.isUser(uid);
    if (exists) knownUsers.add(uid);
    return exists;
  };
  /** Messaging someone makes you friends both ways, so the chat shows up for both. */
  const befriend = async (a: string, b: string) => {
    const missing = [[a, b], [b, a]].filter(([x, y]) => !knownFriends.has(`${x}>${y}`));
    const added = await Promise.all(missing.map(([x, y]) => store.addFriend(x, y)));
    missing.forEach(([x, y]) => knownFriends.add(`${x}>${y}`));
    await Promise.all(missing.filter((_, i) => added[i]).map(([x]) => sendFriends(x)));
  };

  /**
   * Handles one message from `id`. Runs strictly in arrival order per socket (see the chain below).
   * `delivered` is set when the fast path already sent a relayed event; null means "not sent yet".
   */
  const handle = async (ws: WebSocket, id: string, m: ClientMessage, delivered: boolean | null) => {
    switch (m.kind) {
      case 'push':
        return store.setPushToken(id, m.token);

      case 'friend-add': {
        const other = await store.findByUsername(m.username);
        if (!other) return tell(ws, { type: 'notice', text: `No one is called “${m.username}”.` });
        if (other.id === id) return tell(ws, { type: 'notice', text: 'That’s you.' });
        await store.addFriend(id, other.id);
        return sendFriends(id);
      }

      case 'friend-remove':
        await store.removeFriend(id, m.id);
        knownFriends.delete(`${id}>${m.id}`);
        return sendFriends(id);

      case 'relay': {
        const { event } = m;
        const raw = JSON.stringify(event);
        if (delivered === null) {
          if (!(await isKnownUser(event.to))) return;
          delivered = sendTo(event.to, raw);
        }

        // Persistence after delivery, so the database never slows the conversation down.
        await Promise.all([
          m.queued && store.archive(event),
          m.queued && !delivered && store.mailboxAdd(event.to, raw),
          event.type === 'msg' && befriend(id, event.to),
        ]);
        if (!delivered && event.type === 'msg') nudger.nudge(event.to, await store.pushToken(event.to)); // their chat isn't open
        return;
      }
    }
  };

  wss.on('connection', (ws, req) => {
    const hello = parseHandshake(req.url ?? '', key);
    if ('close' in hello) return ws.close(...hello.close);
    const { id, name } = hello;

    // Messages can arrive while we're still registering, so every message waits on this chain.
    let chain: Promise<unknown> = (async () => {
      if ((await store.registerUser(id, name)) === 'taken') {
        ws.close(CLOSE.NAME_TAKEN, 'username taken');
        return;
      }
      owner.set(ws, id);
      knownUsers.add(id);
      broadcast({ type: 'presence', id, online: true });
      const [mail] = await Promise.all([store.mailboxPeek(id), sendFriends(id)]);
      for (const item of mail) ws.send(item.payload);
      if (mail.length) await store.mailboxAck(id, mail[mail.length - 1].id);
    })().catch((err) => {
      console.error('sign-in failed:', err);
      owner.delete(ws);
      ws.close(1011, 'server error'); // the app retries
    });

    ws.on('message', (data) => {
      const m = parseClientMessage(data.toString(), id);
      if (!m) return;
      // Fast path: a signed-in sender writing to a recipient we already know is delivered right now,
      // in arrival order. Everything else (and all database work) waits its turn on the chain.
      const fast = m.kind === 'relay' && owner.has(ws) && knownUsers.has(m.event.to);
      const delivered = fast ? sendTo(m.event.to, JSON.stringify(m.event)) : null;
      chain = chain.then(async () => {
        if (owner.has(ws)) await handle(ws, id, m, delivered); // skip if rejected or closed
      }).catch((err) => console.error('relay error:', err));
    });

    ws.on('close', () => {
      owner.delete(ws);
      nudger.reset(id);
      if (!isOnline(id)) broadcast({ type: 'presence', id, online: false });
    });
  });

  return wss;
}
