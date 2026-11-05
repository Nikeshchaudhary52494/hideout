// End-to-end: real server on a random port, real WebSocket clients, memory store, fake push sender.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createServer, type RunningServer } from '../src/server.ts';
import { createNudger, type PushMessage } from '../src/push.ts';
import { createMemoryStore } from '../src/store/memory.ts';

type Client = WebSocket & { inbox: Record<string, any>[] };

const pushes: PushMessage[] = [];
const store = createMemoryStore();
const nudger = createNudger({ pushUrl: 'fake', send: async (_url, msg) => pushes.push(msg) });
let srv: RunningServer;
const start = async () => (srv = await createServer({ port: 0, key: 'k', store, nudger }));
before(start);
after(() => srv.close());

const url = (id: string, name: string, key = 'k') => `ws://localhost:${srv.port}/?key=${key}&id=${id}&name=${encodeURIComponent(name)}`;
const closeCode = (u: string) => new Promise<number>((r) => new WebSocket(u).on('close', r));
const open = (u: string) => new Promise<Client>((r) => {
  const ws = Object.assign(new WebSocket(u), { inbox: [] as Record<string, any>[] });
  ws.on('message', (d) => ws.inbox.push(JSON.parse(d.toString())));
  ws.on('open', () => r(ws));
});
const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const of = (ws: Client, type: string) => ws.inbox.filter((e) => e.type === type);
const chat = (ws: Client) => ws.inbox.filter((e) => !['ready', 'friends', 'presence', 'notice'].includes(e.type));
const lastFriends = (ws: Client) => (of(ws, 'friends').pop()?.friends ?? []) as { id: string; username: string; online: boolean }[];
const send = (ws: WebSocket, e: object) => ws.send(JSON.stringify(e));

// The rejection also arrives as a normal message, because some proxies drop close frames.
const rejection = (u: string) => new Promise<number>((r) => {
  new WebSocket(u).on('message', (d) => {
    const m = JSON.parse(d.toString());
    if (m.type === 'rejected') r(m.code);
  });
});

test('auth: wrong key, bad name, taken name', async () => {
  assert.equal(await closeCode(url('alice-1', 'alice', 'nope')), 4001);
  assert.equal(await rejection(url('alice-1', 'alice', 'nope')), 4001, 'reason also sent as a message');
  assert.equal(await closeCode(url('alice-1', 'x')), 4003);
  const a = await open(url('alice-1', 'alice'));
  await wait();
  assert.equal(a.inbox[0]?.type, 'ready', 'signed-in clients are told so first');
  assert.equal(await closeCode(url('mallory-1', 'ALICE')), 4002, 'case-insensitive');
  assert.equal(await rejection(url('mallory-1', 'ALICE')), 4002);
  a.close();
  await wait();
});

test('relay: offline mailbox, auto-friends, presence, routing, archive, disguised push', async () => {
  const a = await open(url('alice-1', 'alice'));
  (await open(url('bob-1', 'bob'))).close(); // bob registers, then goes offline
  await wait();

  send(a, { type: 'msg', to: 'bob-1', id: 'm1', text: 'while you were away', ts: 1, from: 'spoofed' });
  await wait();
  assert.deepEqual(lastFriends(a).map((f) => f.username), ['bob'], 'messaging adds a friend');
  assert.equal(store.messages.get('m1')?.text, 'while you were away', 'archived');

  const c = await open(url('carol-1', 'carol'));
  const b = await open(url('bob-1', 'bob'));
  await wait();
  assert.deepEqual(chat(b).map((e) => e.text), ['while you were away'], 'mailbox delivered');
  assert.equal(chat(b)[0].from, 'alice-1', 'server stamps the real sender');
  assert.deepEqual(lastFriends(b), [{ id: 'alice-1', username: 'alice', online: true }], 'and friends both ways');
  assert.ok(of(a, 'presence').some((p) => p.id === 'bob-1' && p.online), 'alice sees bob come online');

  send(b, { type: 'react', to: 'alice-1', id: 'm1', emoji: '❤️' });
  send(b, { type: 'typing', to: 'alice-1' });
  await wait();
  assert.deepEqual(chat(a).map((e) => e.type), ['react', 'typing'], 'routed to alice');
  assert.equal(chat(c).length, 0, 'carol sees nothing');
  assert.deepEqual(store.messages.get('m1')?.reactions, { 'bob-1': '❤️' });

  // carol registers for push, leaves, gets two messages -> exactly one nudge that reveals nothing
  send(c, { type: 'push', token: 'ExponentPushToken[abc-123]' });
  await wait();
  c.close();
  await wait();
  send(a, { type: 'msg', to: 'carol-1', id: 'm2', text: 'secret plans', ts: 2 });
  send(a, { type: 'msg', to: 'carol-1', id: 'm3', text: 'more secrets', ts: 3 });
  await wait();
  assert.equal(pushes.length, 1, 'throttled to one nudge');
  assert.equal(pushes[0].to, 'ExponentPushToken[abc-123]');
  assert.ok(!/secret|alice/i.test(JSON.stringify(pushes[0])), 'nudge leaks nothing');

  a.close();
  b.close();
  await wait();
});

test('friends: add by username, unknown names, remove', async () => {
  const d = await open(url('dave-1', 'dave'));
  await wait();
  send(d, { type: 'friend-add', username: 'BOB' });
  send(d, { type: 'friend-add', username: 'nobody' });
  send(d, { type: 'friend-add', username: 'dave' });
  await wait();
  assert.deepEqual(lastFriends(d).map((f) => f.username), ['bob']);
  assert.deepEqual(of(d, 'notice').map((n) => n.text), ['No one is called “nobody”.', 'That’s you.']);
  send(d, { type: 'friend-remove', id: 'bob-1' });
  await wait();
  assert.deepEqual(lastFriends(d), []);
  d.close();
  await wait();
});

test('server restart: users, friends and undelivered messages survive (they live in the store)', async () => {
  const a = await open(url('alice-1', 'alice'));
  await wait();
  send(a, { type: 'msg', to: 'bob-1', id: 'm4', text: 'after restart', ts: 4 });
  await wait();
  a.close();
  await srv.close();
  await start();

  const b = await open(url('bob-1', 'bob'));
  await wait();
  assert.deepEqual(chat(b).map((e) => e.text), ['after restart']);
  assert.deepEqual(lastFriends(b).map((f) => f.username), ['alice']);
  b.close();
  await wait();
});
