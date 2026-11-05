// The chat engine: saved data, the WebSocket, the offline outbox, and every chat action.
// Screens only call the functions this hook returns; they never touch the socket or storage.
import { useEffect, useRef, useState } from 'react';
import { KEY, SERVER } from '../config';
import { deleteFile } from '../lib/jsonFile';
import { apply, newMessageId, parseIncoming } from './protocol';
import { getPushToken } from './push';
import { keepOutgoingImage, loadDb, saveDb, saveIncomingImage, toWire } from './storage';
import type { ChatDB, ChatEvent, Img, Msg, MsgEvent, OutboxEvent } from './types';

const RETRY_MS = 2000;
const TYPING_SHOW_MS = 3000; // how long "typing…" stays without a new signal
const TYPING_SEND_MS = 2500; // min gap between my typing signals

export type ChatApi = ReturnType<typeof useChat>;

export function useChat(newUsername: string | null) {
  const [db, setDb] = useState<ChatDB>(() => {
    const d = loadDb();
    if (newUsername) d.username = newUsername; // just chosen in the cheat-code screen
    saveDb(d);
    return d;
  });
  // The ref is the source of truth for socket callbacks (which outlive renders); state drives the UI.
  const dbRef = useRef(db);
  const update = (fn: (d: ChatDB) => ChatDB) => {
    dbRef.current = fn(dbRef.current);
    saveDb(dbRef.current);
    setDb(dbRef.current);
  };

  const sock = useRef<WebSocket | null>(null);
  const pushToken = useRef<string | null>(null);
  const rejection = useRef<number | null>(null); // close code the server announced before closing
  const flushing = useRef(false);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState<Record<string, boolean>>({});
  const [typingFrom, setTypingFrom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // connection problems
  const [notice, setNotice] = useState<string | null>(null); // server replies, e.g. unknown username
  const [peer, setPeer] = useState<string | null>(null);
  const activePeer = useRef<string | null>(null); // read by the socket handler
  useEffect(() => {
    activePeer.current = peer;
  }, [peer]);

  const sendNow = (e: object) => {
    if (sock.current?.readyState === WebSocket.OPEN) sock.current.send(JSON.stringify(e));
  };

  // Sends the outbox oldest-first. The outbox is saved, so it survives restarts and offline periods.
  // ponytail: no server acks, so an event sent at the exact moment the connection drops can be lost.
  const flush = async () => {
    const ws = sock.current;
    if (flushing.current || ws?.readyState !== WebSocket.OPEN) return;
    flushing.current = true;
    try {
      while (dbRef.current.outbox.length) {
        const e = dbRef.current.outbox[0];
        let wire: object | null = null;
        try {
          wire = await toWire(e, dbRef.current.msgs);
        } catch (err) {
          console.warn('dropping unsendable event', err); // e.g. photo file gone
        }
        if (ws.readyState !== WebSocket.OPEN) break; // keep it for the next connection
        if (wire) ws.send(JSON.stringify(wire));
        update((d) => ({
          ...d,
          outbox: d.outbox.slice(1),
          msgs: e.type === 'msg' ? d.msgs.map((m) => (m.id === e.id && m.status === 'pending' ? { ...m, status: 'sent' } : m)) : d.msgs,
        }));
      }
    } finally {
      flushing.current = false;
    }
  };

  /** My action: applied locally right away, queued for the recipient. */
  const act = (e: ChatEvent) => {
    const queued: OutboxEvent = e.type === 'msg' ? { type: 'msg', id: e.id } : e;
    update((d) => ({ ...d, msgs: apply(d.msgs, { ...e, from: d.me }, d.me), outbox: [...d.outbox, queued] }));
    flush();
  };

  const markRead = (peerId: string) => {
    const unread = dbRef.current.msgs.filter((m) => m.peer === peerId && m.unread);
    if (!unread.length) return;
    update((d) => ({
      ...d,
      msgs: d.msgs.map((m) => (m.peer === peerId && m.unread ? { ...m, unread: false } : m)),
      outbox: [...d.outbox, ...unread.map((m): OutboxEvent => ({ type: 'read', id: m.id, to: peerId }))],
    }));
    flush();
  };

  const receive = (raw: string) => {
    const e = parseIncoming(raw);
    if (!e) return;
    try {
      switch (e.type) {
        case 'friends':
          setOnline((o) => ({ ...o, ...Object.fromEntries(e.friends.map((f) => [f.id, f.online])) }));
          update((d) => ({
            ...d,
            friends: e.friends.map((f) => f.id),
            users: { ...d.users, ...Object.fromEntries(e.friends.map((f) => [f.id, f.username])) },
          }));
          return;
        case 'presence':
          setOnline((o) => ({ ...o, [e.id]: e.online }));
          return;
        case 'notice':
          setNotice(e.text);
          return;
        case 'ready': // signed in: now it's safe to send (an open socket can still be rejected)
          setConnected(true);
          if (pushToken.current) sendNow({ type: 'push', token: pushToken.current });
          flush();
          return;
        case 'rejected':
          rejection.current = e.code; // read by onclose; the close code itself may be lost by proxies
          return;
        case 'typing':
          setTypingFrom(e.from);
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setTypingFrom(null), TYPING_SHOW_MS);
          return;
        case 'msg': {
          setTypingFrom(null);
          const image = e.image && saveIncomingImage(e.id, e.image);
          update((d) => ({ ...d, msgs: apply(d.msgs, { ...e, image, unread: true }, d.me) }));
          if (activePeer.current === e.from) markRead(e.from);
          return;
        }
        case 'delete':
          deleteFile(dbRef.current.msgs.find((m) => m.id === e.id && m.from === e.from)?.image?.uri);
          update((d) => ({ ...d, msgs: apply(d.msgs, e, d.me) }));
          return;
        default:
          update((d) => ({ ...d, msgs: apply(d.msgs, e, d.me) }));
      }
    } catch (err) {
      console.warn('could not apply event', err);
    }
  };

  // The socket outlives renders, so it calls the latest handlers through this ref.
  const handlers = useRef({ flush, receive });
  useEffect(() => {
    handlers.current = { flush, receive };
  });

  // connection: (re)connects with my id + username, retries on drop
  const { me, username } = db;
  useEffect(() => {
    if (!username) return;
    let alive = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = () => {
      const ws = new WebSocket(`${SERVER}?key=${encodeURIComponent(KEY)}&id=${me}&name=${encodeURIComponent(username)}`);
      sock.current = ws;
      // nothing is sent on open: we wait for the server's 'ready' (see receive)
      ws.onmessage = (ev) => handlers.current.receive(String(ev.data));
      ws.onclose = (ev) => {
        const code = rejection.current ?? ev.code;
        rejection.current = null;
        setConnected(false);
        setOnline({});
        if (code === 4002) return setError(`“${username}” is taken. Tap your name to pick another.`);
        if (code === 4003) return setError('That username isn’t allowed. Tap your name to pick another.');
        if (code === 4001) return setError('This app version can’t reach the server (wrong app key).');
        if (alive) retry = setTimeout(connect, RETRY_MS);
      };
    };
    connect();
    return () => {
      alive = false;
      clearTimeout(retry);
      clearTimeout(typingTimer.current);
      sock.current?.close();
    };
  }, [me, username]);

  // push token: sent now if connected, otherwise on the next connect
  useEffect(() => {
    getPushToken().then((token) => {
      pushToken.current = token;
      if (token) sendNow({ type: 'push', token });
    });
  }, []);

  // ---------- actions for the screens ----------

  const openPeer = (id: string) => {
    setPeer(id);
    markRead(id);
  };

  const sendMessage = (to: string, text: string, draft: Img | null, replyTo?: string) => {
    const id = newMessageId(dbRef.current.me);
    const image = draft ? keepOutgoingImage(id, draft) : undefined;
    const msg: MsgEvent = { type: 'msg', id, to, text, image, replyTo, ts: Date.now(), status: 'pending' };
    act(msg);
  };

  const editMessage = (m: Msg, text: string) => {
    if ((text || m.image) && text !== m.text) act({ type: 'edit', id: m.id, to: m.peer, text });
  };

  /** Tapping the same emoji again removes your reaction. */
  const react = (m: Msg, emoji: string) => {
    act({ type: 'react', id: m.id, to: m.peer, emoji: m.reactions?.[dbRef.current.me] === emoji ? null : emoji });
  };

  const removeMessage = (m: Msg, forEveryone: boolean) => {
    deleteFile(m.image?.uri);
    if (forEveryone) act({ type: 'delete', id: m.id, to: m.peer });
    else update((d) => ({ ...d, msgs: d.msgs.filter((x) => x.id !== m.id) }));
  };

  const signalTyping = (to: string) => {
    if (Date.now() - lastTypingSent.current < TYPING_SEND_MS) return;
    lastTypingSent.current = Date.now();
    sendNow({ type: 'typing', to });
  };

  /** Friends live in the server's database; it answers with the updated list (or a notice). */
  const addFriend = (username: string) => {
    setNotice(null);
    sendNow({ type: 'friend-add', username });
  };
  const removeFriend = (id: string) => sendNow({ type: 'friend-remove', id });

  const rename = (name: string) => {
    setError(null); // e.g. clears "username taken"; the connection retries with the new name
    update((d) => ({ ...d, username: name }));
  };

  return {
    me,
    username,
    users: db.users,
    friends: db.friends,
    msgs: db.msgs,
    connected,
    online,
    typingFrom,
    error,
    notice,
    clearNotice: () => setNotice(null),
    addFriend,
    removeFriend,
    peer,
    openPeer,
    closePeer: () => setPeer(null),
    sendMessage,
    editMessage,
    react,
    removeMessage,
    signalTyping,
    rename,
  };
}
