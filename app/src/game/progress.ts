// Saved game progress (levels, scores, settings, the cheat-code hash) in game.json on the phone.
import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { readJson, writeJson } from '../lib/jsonFile';
import { LEVELS, type ArenaKey } from './rules';

export type Score = { score: number; level: number; arena: ArenaKey; ts: number };
export type Settings = { haptics: boolean; grid: boolean; dpad: boolean };
export type GameData = {
  level: number;
  arena: ArenaKey;
  unlocked: number;
  cleared: number[];
  scores: Score[]; // best first, max 10
  codeHash: string | null; // SHA-256 of the cheat code; the code itself is never stored
  settings: Settings;
};
export type Patch = Partial<GameData> | ((d: GameData) => Partial<GameData>);

const file = new File(Paths.document, 'game.json');
const DEFAULTS: GameData = {
  level: 1, arena: 'box', unlocked: 1, cleared: [], scores: [], codeHash: null,
  settings: { haptics: true, grid: true, dpad: false },
};

export function loadGame(): GameData {
  const d = readJson<Partial<GameData>>(file);
  return d ? { ...DEFAULTS, ...d, settings: { ...DEFAULTS.settings, ...d.settings } } : DEFAULTS;
}

export const saveGame = (d: GameData) => writeJson(file, d);

export const hashCode = (code: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `hideout:${code.trim().toUpperCase()}`);

/** Record a finished run: top-10 scores, cleared levels, unlocking the next level. */
export const recordRun = (score: number, cleared: boolean) => (d: GameData): Partial<GameData> => ({
  scores: score > 0
    ? [...d.scores, { score, level: d.level, arena: d.arena, ts: Date.now() }].sort((a, b) => b.score - a.score).slice(0, 10)
    : d.scores,
  cleared: cleared && !d.cleared.includes(d.level) ? [...d.cleared, d.level] : d.cleared,
  unlocked: cleared ? Math.min(LEVELS, Math.max(d.unlocked, d.level + 1)) : d.unlocked,
});
