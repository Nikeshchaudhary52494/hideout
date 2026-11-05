// Pure chat rules: how events change the message list, and validation of what the server sends.
// No React, no React Native. Tested in protocol.test.ts.
import type { Friend, Incoming, Msg, Stamped } from './types';

/** Applies one event (mine or someone else's) to the message list. */
export function apply(msgs: Msg[], e: Stamped, me: string): Msg[] {
  switch (e.type) {
    case 'msg':
      if (msgs.some((m) => m.id === e.id)) return msgs; // duplicates happen on reconnect
      return [...msgs, {
        id: e.id, from: e.from, peer: e.from === me ? e.to : e.from, text: e.text, ts: e.ts,
        image: e.image, replyTo: e.replyTo, status: e.status, unread: e.unread,
      }];
    case 'edit':
      return msgs.map((m) => (m.id === e.id && m.from === e.from ? { ...m, text: e.text, edited: true } : m));
    case 'delete':
      return msgs.filter((m) => !(m.id === e.id && m.from === e.from)); // only the sender can delete for everyone
    case 'react':
      return msgs.map((m) => {
        if (m.id !== e.id) return m;
        const reactions = { ...m.reactions };
        if (e.emoji) reactions[e.from] = e.emoji;
        else delete reactions[e.from];
        return { ...m, reactions };
      });
    case 'read':
      return msgs.map((m) => (m.id === e.id && m.from !== e.from ? { ...m, status: 'read' } : m));
  }
}

const str = (v: unknown): v is string => typeof v === 'string';
const optStr = (v: unknown) => (str(v) ? v : undefined);

/** Validates a raw socket message. Anything malformed → null. */
export function parseIncoming(raw: string): Incoming | null {
  let e: any; // untrusted JSON, checked field by field below
  try {
    e = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!e || typeof e !== 'object') return null;

  if (e.type === 'friends') {
    if (!Array.isArray(e.friends)) return null;
    const friends: Friend[] = e.friends
      .filter((u: any) => u && str(u.id) && str(u.username))
      .map((u: any) => ({ id: u.id, username: u.username, online: !!u.online }));
    return { type: 'friends', friends };
  }
  if (e.type === 'presence') return str(e.id) ? { type: 'presence', id: e.id, online: !!e.online } : null;
  if (e.type === 'notice') return str(e.text) ? { type: 'notice', text: e.text } : null;
  if (!str(e.from)) return null;
  if (e.type === 'typing') return { type: 'typing', from: e.from };
  if (!str(e.id)) return null;

  const base = { id: e.id, from: e.from, to: str(e.to) ? e.to : '' };
  switch (e.type) {
    case 'msg': {
      const image = e.image && str(e.image.b64)
        ? { b64: e.image.b64, w: Number(e.image.w) || 1, h: Number(e.image.h) || 1 }
        : undefined;
      return { type: 'msg', ...base, text: str(e.text) ? e.text : '', ts: Number(e.ts) || Date.now(), replyTo: optStr(e.replyTo), image };
    }
    case 'edit':
      return str(e.text) ? { type: 'edit', ...base, text: e.text } : null;
    case 'delete':
      return { type: 'delete', ...base };
    case 'react':
      return { type: 'react', ...base, emoji: optStr(e.emoji) ?? null };
    case 'read':
      return { type: 'read', ...base };
    default:
      return null;
  }
}

export const preview = (m: Pick<Msg, 'text'>) => m.text || '📷 Photo';

export const newMessageId = (me: string) => `${me}-${Date.now().toString(36)}`;
