// Wire rules: what a client may connect with and send. Pure, tested in test/protocol.test.ts.

const QUEUED = new Set(['msg', 'edit', 'delete', 'react', 'read']); // held until the recipient connects
const LIVE = new Set(['typing']); // dropped if the recipient is offline

const USER_ID = /^[\w-]{4,40}$/;
const USERNAME = /^[\w .-]{2,20}$/; // same rule as the app
const PUSH_TOKEN = /^Expo(nent)?PushToken\[[\w-]+\]$/;

export const CLOSE = { BAD_KEY: 4001, NAME_TAKEN: 4002, BAD_NAME: 4003 } as const; // the app reacts to these codes

export const MAX_PAYLOAD = 20 * 1024 * 1024; // photos travel as base64 inside events

/** An event being relayed. Only the fields the server looks at are typed; the rest passes through untouched. */
export type RelayEvent = { type: string; to: string; from: string; [field: string]: unknown };

export type Handshake = { id: string; name: string } | { close: [code: number, reason: string] };

export type ClientMessage =
  | { kind: 'push'; token: string }
  | { kind: 'friend-add'; username: string }
  | { kind: 'friend-remove'; id: string }
  | { kind: 'relay'; event: RelayEvent; queued: boolean };

/** Messages the server sends that aren't relayed events. */
export type ServerMessage =
  | { type: 'friends'; friends: { id: string; username: string; online: boolean }[] }
  | { type: 'presence'; id: string; online: boolean }
  | { type: 'notice'; text: string };

/** Checks the connection URL. */
export function parseHandshake(url: string, key: string): Handshake {
  const params = new URL(url, 'http://localhost').searchParams;
  const id = params.get('id') ?? '';
  const name = (params.get('name') ?? '').trim();
  if (params.get('key') !== key || !USER_ID.test(id)) return { close: [CLOSE.BAD_KEY, 'bad key'] };
  if (!USERNAME.test(name)) return { close: [CLOSE.BAD_NAME, 'bad username'] };
  return { id, name };
}

/**
 * Classifies a message from a client; null = ignore it.
 * `event.from` is always set here: never trust the client's claim of who sent it.
 * Whether the recipient exists is checked by the relay (it needs the store).
 */
export function parseClientMessage(data: string, senderId: string): ClientMessage | null {
  let e: unknown;
  try {
    e = JSON.parse(data);
  } catch {
    return null;
  }
  if (!e || typeof e !== 'object') return null;
  const { type, to, token, username, id } = e as Record<string, unknown>;
  switch (type) {
    case 'push':
      return typeof token === 'string' && PUSH_TOKEN.test(token) ? { kind: 'push', token } : null;
    case 'friend-add':
      return typeof username === 'string' && USERNAME.test(username.trim()) ? { kind: 'friend-add', username: username.trim() } : null;
    case 'friend-remove':
      return typeof id === 'string' && USER_ID.test(id) ? { kind: 'friend-remove', id } : null;
  }
  if (typeof type !== 'string' || (!QUEUED.has(type) && !LIVE.has(type))) return null;
  if (typeof to !== 'string' || to === senderId || !USER_ID.test(to)) return null;
  return { kind: 'relay', event: { ...(e as object), type, to, from: senderId }, queued: QUEUED.has(type) };
}
