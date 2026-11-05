import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply, parseIncoming } from './protocol.ts';
import type { Msg } from './types.ts';

const ME = 'me';
const BOB = 'bob';
const send = (msgs: Msg[], id: string, from = ME, text = 'hi') =>
  apply(msgs, { type: 'msg', id, from, to: from === ME ? BOB : ME, text, ts: 1 }, ME);

test('messages: peer is the other person either way; duplicates ignored', () => {
  let msgs = send([], 'a');
  msgs = send(msgs, 'b', BOB);
  msgs = send(msgs, 'b', BOB);
  assert.equal(msgs.length, 2);
  assert.deepEqual(msgs.map((m) => m.peer), [BOB, BOB]);
});

test('only the sender can edit or delete', () => {
  let msgs = send([], 'a');
  msgs = apply(msgs, { type: 'edit', id: 'a', from: BOB, to: ME, text: 'hacked' }, ME);
  assert.equal(msgs[0].text, 'hi');
  msgs = apply(msgs, { type: 'edit', id: 'a', from: ME, to: BOB, text: 'hello' }, ME);
  assert.equal(msgs[0].text, 'hello');
  assert.ok(msgs[0].edited);
  msgs = apply(msgs, { type: 'delete', id: 'a', from: BOB, to: ME }, ME);
  assert.equal(msgs.length, 1);
  msgs = apply(msgs, { type: 'delete', id: 'a', from: ME, to: BOB }, ME);
  assert.equal(msgs.length, 0);
});

test('reactions: one per person, null removes', () => {
  let msgs = send([], 'a');
  msgs = apply(msgs, { type: 'react', id: 'a', from: BOB, to: ME, emoji: '❤️' }, ME);
  msgs = apply(msgs, { type: 'react', id: 'a', from: ME, to: BOB, emoji: '😂' }, ME);
  assert.deepEqual(msgs[0].reactions, { bob: '❤️', me: '😂' });
  msgs = apply(msgs, { type: 'react', id: 'a', from: BOB, to: ME, emoji: null }, ME);
  assert.deepEqual(msgs[0].reactions, { me: '😂' });
});

test('read receipts only mark the reader’s incoming messages', () => {
  let msgs = send([], 'mine');
  msgs = apply(msgs, { type: 'read', id: 'mine', from: BOB, to: ME }, ME);
  assert.equal(msgs[0].status, 'read');
  msgs = send(msgs, 'theirs', BOB);
  msgs = apply(msgs, { type: 'read', id: 'theirs', from: BOB, to: ME }, ME);
  assert.equal(msgs[1].status, undefined);
});

test('parseIncoming rejects junk and normalizes fields', () => {
  assert.equal(parseIncoming('not json'), null);
  assert.equal(parseIncoming('{"type":"msg","id":"x"}'), null, 'no sender');
  assert.equal(parseIncoming('{"type":"nope","id":"x","from":"b"}'), null);
  assert.equal(parseIncoming('{"type":"edit","id":"x","from":"b"}'), null, 'edit without text');
  const m = parseIncoming('{"type":"msg","id":"x","from":"b","to":"me","text":5,"image":{"b64":"AA","w":"3"}}');
  assert.deepEqual(m, { type: 'msg', id: 'x', from: 'b', to: 'me', text: '', ts: (m as any).ts, replyTo: undefined, image: { b64: 'AA', w: 3, h: 1 } });
  const f = parseIncoming('{"type":"friends","friends":[{"id":"a","username":"al","online":1},{"id":5}]}');
  assert.deepEqual(f, { type: 'friends', friends: [{ id: 'a', username: 'al', online: true }] });
  assert.deepEqual(parseIncoming('{"type":"presence","id":"a","online":0}'), { type: 'presence', id: 'a', online: false });
  assert.equal(parseIncoming('{"type":"presence"}'), null);
  assert.deepEqual(parseIncoming('{"type":"notice","text":"hi"}'), { type: 'notice', text: 'hi' });
});
