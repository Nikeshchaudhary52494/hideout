// In-memory Store: for tests, and for running without a database. Same behavior as Postgres.
import type { RelayEvent } from '../protocol.ts';
import { eventEmoji, eventId, eventText, toArchivedMessage, type ArchivedMessage } from './archive.ts';
import type { MailItem, Store } from './types.ts';

type Row = ArchivedMessage & { reactions: Record<string, string>; edited: boolean; readAt: Date | null };

export function createMemoryStore(): Store & { messages: Map<string, Row> } {
  const users = new Map<string, { username: string; pushToken: string | null }>();
  const friends = new Map<string, Set<string>>(); // userId -> friendIds
  const mailbox: (MailItem & { userId: string })[] = [];
  const messages = new Map<string, Row>();
  let nextMailId = 1;

  return {
    messages, // exposed for tests

    async registerUser(id, username) {
      const taken = [...users].some(([uid, u]) => uid !== id && u.username.toLowerCase() === username.toLowerCase());
      if (taken) return 'taken';
      users.set(id, { username, pushToken: users.get(id)?.pushToken ?? null });
      return 'ok';
    },
    isUser: async (id) => users.has(id),
    async findByUsername(username) {
      const hit = [...users].find(([, u]) => u.username.toLowerCase() === username.toLowerCase());
      return hit ? { id: hit[0], username: hit[1].username } : null;
    },

    async setPushToken(id, token) {
      const u = users.get(id);
      if (u) u.pushToken = token;
    },
    pushToken: async (id) => users.get(id)?.pushToken ?? null,

    async friendsOf(id) {
      return [...(friends.get(id) ?? [])]
        .map((fid) => ({ id: fid, username: users.get(fid)?.username ?? '' }))
        .sort((a, b) => a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
    },
    async addFriend(userId, friendId) {
      if (userId === friendId) return false;
      const set = friends.get(userId) ?? new Set<string>();
      friends.set(userId, set);
      if (set.has(friendId)) return false;
      set.add(friendId);
      return true;
    },
    async removeFriend(userId, friendId) {
      friends.get(userId)?.delete(friendId);
    },

    async mailboxAdd(userId, payload) {
      mailbox.push({ id: nextMailId++, userId, payload });
    },
    mailboxPeek: async (userId) => mailbox.filter((m) => m.userId === userId).map(({ id, payload }) => ({ id, payload })),
    async mailboxAck(userId, upToId) {
      for (let i = mailbox.length - 1; i >= 0; i--) if (mailbox[i].userId === userId && mailbox[i].id <= upToId) mailbox.splice(i, 1);
    },

    async archive(e: RelayEvent) {
      const id = eventId(e);
      const row = id ? messages.get(id) : undefined;
      switch (e.type) {
        case 'msg': {
          const m = toArchivedMessage(e);
          if (m && !messages.has(m.id)) messages.set(m.id, { ...m, reactions: {}, edited: false, readAt: null });
          return;
        }
        case 'edit':
          if (row && row.senderId === e.from) Object.assign(row, { text: eventText(e) ?? '', edited: true });
          return;
        case 'delete':
          if (row && row.senderId === e.from) messages.delete(row.id);
          return;
        case 'react': {
          if (!row || (e.from !== row.senderId && e.from !== row.recipientId)) return;
          const emoji = eventEmoji(e);
          if (emoji) row.reactions[e.from] = emoji;
          else delete row.reactions[e.from];
          return;
        }
        case 'read':
          if (row && row.recipientId === e.from) row.readAt ??= new Date();
          return;
      }
    },

    close: async () => {},
  };
}
