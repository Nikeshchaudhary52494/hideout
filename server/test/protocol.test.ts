import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLOSE, parseClientMessage, parseHandshake, type ClientMessage } from '../src/protocol.ts';

const hs = (q: string) => parseHandshake(`/?${q}`, 'k');
const closeCode = (q: string) => {
  const h = hs(q);
  return 'close' in h ? h.close[0] : null;
};
const parse = (msg: object | string, sender = 'alice-1') => parseClientMessage(typeof msg === 'string' ? msg : JSON.stringify(msg), sender);
const relayed = (m: ClientMessage | null) => {
  assert.ok(m && m.kind === 'relay');
  return m;
};

test('handshake: key, id and username are checked', () => {
  assert.deepEqual(hs('key=k&id=alice-1&name=alice'), { id: 'alice-1', name: 'alice' });
  assert.deepEqual(hs('key=k&id=alice-1&name=%20alice%20'), { id: 'alice-1', name: 'alice' }, 'trimmed');
  assert.equal(closeCode('key=nope&id=alice-1&name=alice'), CLOSE.BAD_KEY);
  assert.equal(closeCode('key=k&id=a!&name=alice'), CLOSE.BAD_KEY);
  assert.equal(closeCode('key=k&id=alice-1&name=x'), CLOSE.BAD_NAME);
});

test('relayed events: server stamps the sender, rejects junk', () => {
  const m = relayed(parse({ type: 'msg', to: 'bob-1', id: 'm1', from: 'spoofed' }));
  assert.equal(m.event.from, 'alice-1');
  assert.equal(m.event.id, 'm1', 'other fields pass through');
  assert.ok(m.queued);
  assert.equal(relayed(parse({ type: 'typing', to: 'bob-1' })).queued, false);

  assert.equal(parse('not json'), null);
  assert.equal(parse({ type: 'hack', to: 'bob-1' }), null, 'unknown type');
  assert.equal(parse({ type: 'msg', to: 'x' }), null, 'malformed recipient id');
  assert.equal(parse({ type: 'msg', to: 'alice-1' }), null, 'to self');
});

test('push tokens must look like Expo tokens', () => {
  assert.deepEqual(parse({ type: 'push', token: 'ExponentPushToken[abc-1]' }), { kind: 'push', token: 'ExponentPushToken[abc-1]' });
  assert.equal(parse({ type: 'push', token: 'https://evil' }), null);
});

test('friend requests are validated', () => {
  assert.deepEqual(parse({ type: 'friend-add', username: ' bob ' }), { kind: 'friend-add', username: 'bob' });
  assert.equal(parse({ type: 'friend-add', username: 'b' }), null);
  assert.deepEqual(parse({ type: 'friend-remove', id: 'bob-1' }), { kind: 'friend-remove', id: 'bob-1' });
  assert.equal(parse({ type: 'friend-remove', id: '!!' }), null);
});
