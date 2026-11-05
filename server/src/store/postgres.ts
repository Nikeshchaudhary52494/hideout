// Store backed by Postgres (Supabase). Schema in schema.sql, applied on start.
import { readFileSync } from 'node:fs';
import pg from 'pg';
import type { RelayEvent } from '../protocol.ts';
import { eventEmoji, eventId, eventText, toArchivedMessage } from './archive.ts';
import type { Store, UserRef } from './types.ts';

const SCHEMA = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const UNIQUE_VIOLATION = '23505';

/** `ca`: PEM of the server's root CA, so TLS is fully verified (Supabase uses its own root). */
export async function createPostgresStore({ url, ca }: { url: string; ca?: string }): Promise<Store> {
  const pool = new pg.Pool({ connectionString: url, ssl: ca ? { ca } : undefined, max: 5 });
  await pool.query(SCHEMA);
  const q = (text: string, values: unknown[] = []) => pool.query(text, values);

  return {
    async registerUser(id, username) {
      try {
        await q(
          `insert into hideout.users (id, username) values ($1, $2)
           on conflict (id) do update set username = excluded.username, last_seen = now()`,
          [id, username],
        );
        return 'ok';
      } catch (err) {
        if ((err as { code?: string }).code === UNIQUE_VIOLATION) return 'taken';
        throw err;
      }
    },

    async isUser(id) {
      return (await q('select 1 from hideout.users where id = $1', [id])).rowCount === 1;
    },

    async findByUsername(username) {
      const r = await q('select id, username from hideout.users where lower(username) = lower($1)', [username]);
      return (r.rows[0] as UserRef | undefined) ?? null;
    },

    async setPushToken(id, token) {
      await q('update hideout.users set push_token = $2 where id = $1', [id, token]);
    },

    async pushToken(id) {
      const r = await q('select push_token from hideout.users where id = $1', [id]);
      return (r.rows[0]?.push_token as string | null | undefined) ?? null;
    },

    async friendsOf(id) {
      const r = await q(
        `select u.id, u.username from hideout.friends f join hideout.users u on u.id = f.friend_id
         where f.user_id = $1 order by lower(u.username)`,
        [id],
      );
      return r.rows as UserRef[];
    },

    async addFriend(userId, friendId) {
      const r = await q('insert into hideout.friends (user_id, friend_id) values ($1, $2) on conflict do nothing', [userId, friendId]);
      return r.rowCount === 1;
    },

    async removeFriend(userId, friendId) {
      await q('delete from hideout.friends where user_id = $1 and friend_id = $2', [userId, friendId]);
    },

    async mailboxAdd(userId, payload) {
      await q('insert into hideout.mailbox (user_id, payload) values ($1, $2)', [userId, payload]);
    },

    async mailboxPeek(userId) {
      const r = await q('select id, payload from hideout.mailbox where user_id = $1 order by id', [userId]);
      return r.rows.map((row) => ({ id: Number(row.id), payload: row.payload as string }));
    },

    async mailboxAck(userId, upToId) {
      await q('delete from hideout.mailbox where user_id = $1 and id <= $2', [userId, upToId]);
    },

    async archive(e: RelayEvent) {
      const id = eventId(e);
      if (!id) return;
      switch (e.type) {
        case 'msg': {
          const m = toArchivedMessage(e);
          if (!m) return;
          await q(
            `insert into hideout.messages (id, sender_id, recipient_id, text, image, reply_to, sent_at)
             values ($1, $2, $3, $4, $5, $6, $7) on conflict (id) do nothing`,
            [m.id, m.senderId, m.recipientId, m.text, m.image, m.replyTo, m.sentAt],
          );
          return;
        }
        case 'edit': // only the sender can edit or delete
          await q('update hideout.messages set text = $3, edited = true where id = $1 and sender_id = $2', [id, e.from, eventText(e) ?? '']);
          return;
        case 'delete':
          await q('delete from hideout.messages where id = $1 and sender_id = $2', [id, e.from]);
          return;
        case 'react': {
          const emoji = eventEmoji(e);
          await q(
            `update hideout.messages
             set reactions = case when $3::text is null then reactions - $2 else reactions || jsonb_build_object($2::text, $3::text) end
             where id = $1 and $2 in (sender_id, recipient_id)`,
            [id, e.from, emoji],
          );
          return;
        }
        case 'read':
          await q('update hideout.messages set read_at = coalesce(read_at, now()) where id = $1 and recipient_id = $2', [id, e.from]);
          return;
      }
    },

    close: () => pool.end(),
  };
}
