import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO, MAPS, N, autopilot, buildArena, canTurn, fresh, step, type Arena, type GameState } from './rules.ts';

const at = (arena: Arena, o: Partial<GameState>): GameState => ({ ...fresh(arena), ...o });

test('maps are N x N with a clear start row', () => {
  for (const m of [MAPS.MAZE, MAPS.SHAPES]) {
    assert.equal(m.length, N);
    m.forEach((r) => assert.equal(r.length, N));
    assert.equal(m[8], '.'.repeat(N));
  }
});

test('eating grows the snake', () => {
  const box = buildArena('box');
  const s = step(at(box, { food: [7, 8] }), box);
  assert.equal(s.snake.length, 4);
  assert.equal(s.eaten, 1);
});

test('walls kill, free boundary wraps', () => {
  const box = buildArena('box');
  const free = buildArena('free');
  const edge: GameState['snake'] = [[16, 8], [15, 8], [14, 8]];
  assert.ok(step(at(box, { snake: edge }), box).dead);
  assert.deepEqual(step(at(free, { snake: edge }), free).snake[0], [0, 8]);
});

test('moving into the cell the tail is leaving is fine; hitting the body is not', () => {
  const box = buildArena('box');
  assert.ok(!step(at(box, { snake: [[5, 5], [6, 5], [6, 6], [5, 6]], dir: [0, 1] }), box).dead);
  assert.ok(step(at(box, { snake: [[5, 5], [6, 5], [6, 6], [5, 6], [4, 6], [4, 5]], dir: [0, 1] }), box).dead);
});

test('tall board: maps centered, extra rows playable, wraps vertically', () => {
  const maze = buildArena('maze', 25);
  const box = buildArena('box', 25);
  const free = buildArena('free', 25);
  assert.deepEqual(box.start[0], [6, 12]);
  assert.ok(maze.walls.some(([x, y]) => x === 2 && y === 7), 'maze wall (2,3) shifted down by 4');
  assert.ok(step(at(box, { snake: [[5, 24], [5, 23], [5, 22]], dir: [0, 1] }), box).dead);
  assert.ok(!step(at(box, { snake: [[5, 20], [5, 19], [5, 18]], dir: [0, 1] }), box).dead);
  assert.deepEqual(step(at(free, { snake: [[5, 24], [5, 23], [5, 22]], dir: [0, 1] }), free).snake[0], [5, 0]);
  for (let i = 0; i < 1000; i++) {
    const f = fresh(maze).food;
    assert.ok(f[1] < 25 && !maze.walls.some((w) => w[0] === f[0] && w[1] === f[1]));
  }
});

test('turns: no reversing, no repeats', () => {
  assert.ok(canTurn([1, 0], [0, 1]));
  assert.ok(!canTurn([1, 0], [-1, 0]));
  assert.ok(!canTurn([1, 0], [1, 0]));
});

test('menu demo snake eats steadily', () => {
  let s = fresh(DEMO);
  let ate = 0;
  for (let i = 0; i < 3000; i++) {
    const n = step({ ...s, dir: autopilot(s) }, DEMO);
    if (n.dead) s = fresh(DEMO);
    else {
      if (n.eaten > s.eaten) ate++;
      s = n.snake.length > 22 ? fresh(DEMO) : n;
    }
  }
  assert.ok(ate > 200, `ate ${ate}`);
});
