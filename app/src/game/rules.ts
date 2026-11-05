// Pure game rules: no React, no React Native. Tested in rules.test.ts.

export type Cell = [number, number]; // [x, y]
export type ArenaKey = 'free' | 'box' | 'maze' | 'shapes';
export type ArenaDef = { name: string; desc: string; wrap: boolean; walls: Cell[] };
export type Arena = ArenaDef & { cols: number; rows: number; start: Cell[] };
export type GameState = { snake: Cell[]; dir: Cell; food: Cell; eaten: number; dead: boolean };

export const N = 17; // board is N columns wide (and at least N rows tall)
export const TARGET = 10; // food needed to clear a level
export const LEVELS = 10;
export const tickMs = (lvl: number) => Math.round(280 * 0.82 ** (lvl - 1)); // L1 280ms (slow) … L10 47ms (brutal)
export const speed = (lvl: number) => (1000 / tickMs(lvl)).toFixed(1);
export const scoreFor = (eaten: number, lvl: number) => eaten * 10 * lvl;
export const START: Cell[] = [[6, 8], [5, 8], [4, 8]];

const MAZE = [
  '.................',
  '.................',
  '..#####...#####..',
  '..#...........#..',
  '..#...........#..',
  '.................',
  '.....#######.....',
  '.................',
  '.................',
  '.................',
  '.....#######.....',
  '.................',
  '..#...........#..',
  '..#...........#..',
  '..#####...#####..',
  '.................',
  '.................',
];
const SHAPES = [
  '.................',
  '.................',
  '..##....#....##..',
  '..##...###...##..',
  '........#........',
  '.................',
  '...##.......##...',
  '...##.......##...',
  '.................',
  '.................',
  '...##.......##...',
  '...##.......##...',
  '.................',
  '........#........',
  '..##...###...##..',
  '..##....#....##..',
  '.................',
];
export const MAPS = { MAZE, SHAPES }; // exported for the map-shape test
const parse = (rows: string[]): Cell[] => rows.flatMap((r, y) => [...r].flatMap((c, x): Cell[] => (c === '#' ? [[x, y]] : [])));

export const ARENAS: Record<ArenaKey, ArenaDef> = {
  free: { name: 'Free Boundary', desc: 'No walls. Leave one side, come back on the other.', wrap: true, walls: [] },
  box: { name: 'Box Arena', desc: 'The classic. Touch a wall and it’s over.', wrap: false, walls: [] },
  maze: { name: 'Maze Arena', desc: 'Corridors and tight corners.', wrap: false, walls: parse(MAZE) },
  shapes: { name: 'Box Shapes', desc: 'Blocks scattered across the field.', wrap: false, walls: parse(SHAPES) },
};
export const ARENA_KEYS = Object.keys(ARENAS) as ArenaKey[];

const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

/** A playable arena: N columns, `rows` rows. On tall screens the board gets taller; maps stay centered. */
export function buildArena(key: ArenaKey, rows = N): Arena {
  const a = ARENAS[key];
  const pad = Math.floor((rows - N) / 2);
  const shift = ([x, y]: Cell): Cell => [x, y + pad];
  return { ...a, cols: N, rows, walls: a.walls.map(shift), start: START.map(shift) };
}

function spawnFood(snake: Cell[], arena: Arena): Cell {
  while (true) {
    const f: Cell = [Math.floor(Math.random() * arena.cols), Math.floor(Math.random() * arena.rows)];
    if (!snake.some((p) => same(p, f)) && !arena.walls.some((p) => same(p, f))) return f;
  }
}

export const fresh = (arena: Arena): GameState => ({
  snake: arena.start, dir: [1, 0], food: spawnFood(arena.start, arena), eaten: 0, dead: false,
});

/** One game step. */
export function step(s: GameState, arena: Arena): GameState {
  const { wrap, walls, cols, rows } = arena;
  let head: Cell = [s.snake[0][0] + s.dir[0], s.snake[0][1] + s.dir[1]];
  if (wrap) head = [(head[0] + cols) % cols, (head[1] + rows) % rows];
  const eats = same(head, s.food);
  const body = eats ? s.snake : s.snake.slice(0, -1); // the tail moves out of the way unless we grow
  const out = head[0] < 0 || head[1] < 0 || head[0] >= cols || head[1] >= rows;
  if (out || walls.some((p) => same(p, head)) || body.some((p) => same(p, head))) return { ...s, dead: true };
  const snake = [head, ...body];
  return eats ? { ...s, snake, eaten: s.eaten + 1, food: spawnFood(snake, arena) } : { ...s, snake };
}

/** True if turning to `d` is allowed after `last` (no reversing into yourself, no no-op turns). */
export const canTurn = (last: Cell, d: Cell) => !(d[0] === -last[0] && d[1] === -last[1]) && !same(d, last);

// ---------- menu demo ----------

export const DEMO = buildArena('free');

/** Self-playing snake for the menu: head for the food, never turn into certain death. */
export function autopilot(s: GameState): Cell {
  const dirs = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as Cell[]).filter((d) => !(d[0] === -s.dir[0] && d[1] === -s.dir[1]));
  const safe = dirs.filter((d) => !step({ ...s, dir: d }, DEMO).dead);
  const dist = (d: Cell) => {
    const h = [(s.snake[0][0] + d[0] + N) % N, (s.snake[0][1] + d[1] + N) % N];
    return Math.abs(h[0] - s.food[0]) + Math.abs(h[1] - s.food[1]);
  };
  return (safe.length ? safe : dirs).sort((a, b) => dist(a) - dist(b))[0];
}
