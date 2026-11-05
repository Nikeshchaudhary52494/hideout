import { test } from 'node:test';
import assert from 'node:assert/strict';
import { awayOnPurpose, isAwayOnPurpose } from './appLock.ts';

test('auto-lock is paused only while an intentional trip (picker, camera, prompt) is open', async () => {
  assert.equal(isAwayOnPurpose(), false);
  const seen = await awayOnPurpose(async () => isAwayOnPurpose());
  assert.equal(seen, true, 'paused during the trip');
  assert.equal(isAwayOnPurpose(), false, 'back on afterwards');
});

test('a failing picker still turns the auto-lock back on', async () => {
  await assert.rejects(awayOnPurpose(async () => { throw new Error('picker crashed'); }));
  assert.equal(isAwayOnPurpose(), false);
});
