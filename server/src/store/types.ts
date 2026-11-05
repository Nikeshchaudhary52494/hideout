import type { RelayEvent } from '../protocol.ts';

export type UserRef = { id: string; username: string };
export type MailItem = { id: number; payload: string };

/** Everything the server persists. Implemented by Postgres (production) and memory (tests / no-DB dev). */
export interface Store {
  /** Creates or renames a user. 'taken' if another user already has that name (case-insensitive). */
  registerUser(id: string, username: string): Promise<'ok' | 'taken'>;
  isUser(id: string): Promise<boolean>;
  findByUsername(username: string): Promise<UserRef | null>;

  setPushToken(id: string, token: string): Promise<void>;
  pushToken(id: string): Promise<string | null>;

  friendsOf(id: string): Promise<UserRef[]>;
  /** Returns true if this was a new friendship. */
  addFriend(userId: string, friendId: string): Promise<boolean>;
  removeFriend(userId: string, friendId: string): Promise<void>;

  mailboxAdd(userId: string, payload: string): Promise<void>;
  mailboxPeek(userId: string): Promise<MailItem[]>;
  /** Removes delivered items: everything for this user up to and including `upToId`. */
  mailboxAck(userId: string, upToId: number): Promise<void>;

  /** Mirrors a relayed event into the message archive. */
  archive(e: RelayEvent): Promise<void>;

  close(): Promise<void>;
}
