export type Img = { uri: string; w: number; h: number }; // a photo saved on this phone
export type WireImg = { b64: string; w: number; h: number }; // a photo travelling over the socket

export type MsgStatus = 'pending' | 'sent' | 'read';

export type Msg = {
  id: string;
  from: string; // sender's user id
  peer: string; // the other person in this conversation (works for sent and received)
  text: string;
  ts: number;
  image?: Img;
  replyTo?: string; // id of the quoted message
  status?: MsgStatus; // only on my messages
  unread?: boolean; // only on received messages
  edited?: boolean;
  reactions?: Record<string, string>; // userId -> emoji
};

// Events that change messages. `to` = recipient. `from` is stamped by the server (or set to me locally).
export type MsgEvent = {
  type: 'msg'; id: string; to: string; text: string; ts: number;
  image?: Img; replyTo?: string; status?: MsgStatus; unread?: boolean;
};
export type EditEvent = { type: 'edit'; id: string; to: string; text: string };
export type DeleteEvent = { type: 'delete'; id: string; to: string };
export type ReactEvent = { type: 'react'; id: string; to: string; emoji: string | null };
export type ReadEvent = { type: 'read'; id: string; to: string };
export type ChatEvent = MsgEvent | EditEvent | DeleteEvent | ReactEvent | ReadEvent;
export type Stamped<E extends ChatEvent = ChatEvent> = E & { from: string };

/** What waits in the outbox. New messages are stored by id, so edits before sending are picked up. */
export type OutboxEvent = { type: 'msg'; id: string } | Exclude<ChatEvent, MsgEvent>;

export type Friend = { id: string; username: string; online: boolean };

/** Anything the server can send us, after validation. */
export type Incoming =
  | { type: 'ready' } // signed in; only now is it safe to send the outbox
  | { type: 'friends'; friends: Friend[] } // my full friends list (on connect and whenever it changes)
  | { type: 'presence'; id: string; online: boolean }
  | { type: 'notice'; text: string } // e.g. "No one is called …"
  | { type: 'rejected'; code: number } // sign-in refused; also sent as a message because proxies can drop close codes
  | { type: 'typing'; from: string }
  | (Omit<Stamped<MsgEvent>, 'image'> & { image?: WireImg })
  | Stamped<Exclude<ChatEvent, MsgEvent>>;

/** Everything the chat saves on the phone. */
export type ChatDB = {
  me: string; // my user id (random, made on first launch)
  username: string | null;
  users: Record<string, string>; // everyone seen so far: id -> username (so names show offline)
  friends: string[]; // my friends' ids, as last sent by the server (the server's database is the source of truth)
  msgs: Msg[];
  outbox: OutboxEvent[];
};
