// One contract, two implementations: the memory store always, Postgres when DB settings exist (.env).
// Postgres runs use unique ids and delete their rows afterwards.
import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { config } from '../src/config.ts';
import { createMemoryStore } from '../src/store/memory.ts';
import { createPostgresStore } from '../src/store/postgres.ts';
import type { Store } from '../src/store/types.ts';

function contract(name: string, makeStore: () => Promise<Store>, cleanup: (prefix: string) => Promise<void> = async () => {}) {
  describe(name, () => {
    const p = `t${randomUUID().slice(0, 8)}`; // unique per run
    const [ann, ben, cat] = [`${p}-ann`, `${p}-ben`, `${p}-cat`];
    let store: Store;

    after(async () => {
      await cleanup(p);
      await store?.close();
    });

    test('users: register, rename, unique names (case-insensitive)', async () => {
      store = await makeStore();
      assert.equal(await store.registerUser(ann, `${p}_Ann`), 'ok');
      assert.equal(await store.registerUser(ben, `${p}_ann`), 'taken');
      assert.equal(await store.registerUser(ben, `${p}_ben`), 'ok');
      assert.equal(await store.registerUser(cat, `${p}_cat`), 'ok');
      assert.equal(await store.registerUser(ann, `${p}_Ann`), 'ok', 're-register same name');
      assert.ok(await store.isUser(ann));
      assert.ok(!(await store.isUser(`${p}-nobody`)));
      assert.deepEqual(await store.findByUsername(`${p}_BEN`), { id: ben, username: `${p}_ben` });
      assert.equal(await store.findByUsername(`${p}_nobody`), null);
    });

    test('push tokens', async () => {
      assert.equal(await store.pushToken(ann), null);
      await store.setPushToken(ann, 'ExponentPushToken[x]');
      assert.equal(await store.pushToken(ann), 'ExponentPushToken[x]');
    });

    test('friends: one-way, idempotent, removable', async () => {
      assert.equal(await store.addFriend(ann, ben), true);
      assert.equal(await store.addFriend(ann, ben), false);
      assert.equal(await store.addFriend(ann, cat), true);
      assert.deepEqual((await store.friendsOf(ann)).map((f) => f.id), [ben, cat]);
      assert.deepEqual(await store.friendsOf(ben), []);
      await store.removeFriend(ann, cat);
      assert.deepEqual((await store.friendsOf(ann)).map((f) => f.username), [`${p}_ben`]);
    });

    test('mailbox: in order, acked items are gone', async () => {
      await store.mailboxAdd(ben, 'one');
      await store.mailboxAdd(ben, 'two');
      const mail = await store.mailboxPeek(ben);
      assert.deepEqual(mail.map((m) => m.payload), ['one', 'two']);
      await store.mailboxAdd(ben, 'three'); // arrives after the peek: must survive the ack
      await store.mailboxAck(ben, mail[1].id);
      assert.deepEqual((await store.mailboxPeek(ben)).map((m) => m.payload), ['three']);
    });

    test('archive: messages, edits, reactions, reads, deletes', async () => {
      const id = `${p}-m1`;
      await store.archive({ type: 'msg', id, from: ann, to: ben, text: 'hi', ts: 1_700_000_000_000, image: { w: 4, h: 3, b64: 'AAAA' } });
      await store.archive({ type: 'edit', id, from: ben, to: ann, text: 'hacked' }); // not the sender: ignored
      await store.archive({ type: 'edit', id, from: ann, to: ben, text: 'hello' });
      await store.archive({ type: 'react', id, from: ben, to: ann, emoji: '❤️' });
      await store.archive({ type: 'react', id, from: cat, to: ann, emoji: '😂' }); // not in the chat: ignored
      await store.archive({ type: 'read', id, from: ben, to: ann });
      if (name === 'memory store') {
        const row = (store as ReturnType<typeof createMemoryStore>).messages.get(id)!;
        assert.equal(row.text, 'hello');
        assert.deepEqual(row.reactions, { [ben]: '❤️' });
      }
      await store.archive({ type: 'delete', id, from: ben, to: ann }); // not the sender: ignored
      await store.archive({ type: 'react', id, from: ben, to: ann, emoji: null });
      // read the row back through SQL for Postgres
      await verify?.(id, { text: 'hello', edited: true, reactions: {}, read: true, image: { w: 4, h: 3 } });
      await store.archive({ type: 'delete', id, from: ann, to: ben });
      await verify?.(id, null);
    });

    let verify: ((id: string, expected: object | null) => Promise<void>) | undefined;
    if (name !== 'memory store') {
      verify = async (id, expected) => {
        const c = new pg.Client({ connectionString: config.db!.url, ssl: config.db!.ca ? { ca: config.db!.ca } : undefined });
        await c.connect();
        const r = await c.query('select text, edited, reactions, read_at is not null as read, image from hideout.messages where id = $1', [id]);
        await c.end();
        assert.deepEqual(r.rows[0] ?? null, expected);
      };
    }
  });
}

contract('memory store', async () => createMemoryStore());

if (config.db) {
  const db = config.db;
  contract('postgres store', () => createPostgresStore(db), async (prefix) => {
    const c = new pg.Client({ connectionString: db.url, ssl: db.ca ? { ca: db.ca } : undefined });
    await c.connect();
    await c.query("delete from hideout.users where id like $1 || '-%'", [prefix]); // cascades to friends, messages, mailbox
    await c.end();
  });
} else {
  test('postgres store', { skip: 'no DB_CONNECTION_STRING in .env' }, () => {});
}
