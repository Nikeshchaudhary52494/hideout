import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RoundBtn, type IconName } from '../../ui/buttons';
import { C, F } from '../../theme';
import { withTap } from '../../lib/haptics';
import {
  ARENAS, N, TARGET, buildArena, canTurn, fresh, scoreFor, speed, step, tickMs,
  type Arena, type ArenaKey, type Cell, type GameState,
} from '../rules';
import type { Settings } from '../progress';
import type { Buzz } from '../useBuzz';
import { Food, Snake } from '../components/Board';
import { Header } from '../components/Header';
import { PlayOverlay } from '../components/PlayOverlay';

type Status = 'ready' | 'playing' | 'paused' | 'over' | 'cleared';
type SizedArena = Arena & { cell: number };

const BOARD_CHROME = 15; // board card padding + border, both sides
const SWIPE_MIN = 18; // px; shorter touches count as taps

type Props = {
  level: number;
  arenaKey: ArenaKey;
  settings: Settings;
  best: number;
  buzz: Buzz;
  exit: () => void;
  onEnd: (score: number, cleared: boolean) => void;
  next: () => void;
};

export function Play({ level, arenaKey, settings, best, buzz, exit, onEnd, next }: Props) {
  // The board fills the space left under the header (and above the arrow buttons, if shown):
  // columns stay fixed, extra height becomes extra rows.
  const [arena, setArena] = useState<SizedArena | null>(null);
  const [game, setGame] = useState<GameState | null>(null); // what's drawn
  const gameRef = useRef<GameState | null>(null); // same value, for the timer and touch handlers
  const show = (g: GameState) => {
    gameRef.current = g;
    setGame(g);
  };

  const onBoardSpace = (e: LayoutChangeEvent) => {
    if (arena) return; // portrait-locked; measure once
    const { width: w, height: h } = e.nativeEvent.layout;
    const cell = Math.floor(Math.min((w - BOARD_CHROME) / N, (h - BOARD_CHROME) / N));
    const rows = Math.max(N, Math.floor((h - BOARD_CHROME) / cell));
    const a = { ...buildArena(arenaKey, rows), cell };
    show(fresh(a));
    setArena(a);
  };

  const queue = useRef<Cell[]>([]); // buffered turns, so two quick swipes both count
  const touch = useRef<Cell | null>(null);
  const [status, setStatus] = useState<Status>('ready');
  const eaten = game?.eaten ?? 0;
  const score = scoreFor(eaten, level);

  useEffect(() => {
    if (status !== 'playing' || !arena) return;
    const timer = setInterval(() => {
      const prev = gameRef.current;
      if (!prev) return;
      const turn = queue.current.shift();
      const now = step(turn ? { ...prev, dir: turn } : prev, arena);
      show(now);
      if (now.dead) {
        buzz('heavy');
        setStatus('over');
        onEnd(scoreFor(now.eaten, level), false);
      } else if (now.eaten > prev.eaten) {
        buzz();
        if (now.eaten >= TARGET) {
          buzz('success');
          setStatus('cleared');
          onEnd(scoreFor(now.eaten, level), true);
        }
      }
    }, tickMs(level));
    return () => clearInterval(timer);
  }, [status, arena, level, buzz, onEnd]);

  const turn = (d: Cell) => {
    const g = gameRef.current;
    if (!g || (status !== 'playing' && status !== 'ready')) return;
    if (status === 'ready') setStatus('playing');
    const last = queue.current[queue.current.length - 1] ?? g.dir;
    if (canTurn(last, d) && queue.current.length < 2) queue.current.push(d);
  };

  const restart = () => {
    if (!arena) return;
    show(fresh(arena));
    queue.current = [];
    setStatus('ready');
  };

  const togglePause = () => setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s));

  const onTouchEnd = (e: GestureResponderEvent) => {
    if (!touch.current) return;
    const dx = e.nativeEvent.pageX - touch.current[0];
    const dy = e.nativeEvent.pageY - touch.current[1];
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) {
      if (status === 'ready') setStatus('playing'); // tap to start
      return;
    }
    turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
  };

  // static layers are memoized so they aren't rebuilt every tick
  const gridLayer = useMemo(() => arena && settings.grid && Array.from({ length: arena.cols * arena.rows }, (_, i) => {
    const x = i % arena.cols;
    const y = Math.floor(i / arena.cols);
    const c = arena.cell;
    return (x + y) % 2 ? null : <View key={i} style={[s.checker, { left: x * c, top: y * c, width: c, height: c }]} />;
  }), [arena, settings.grid]);
  const wallLayer = useMemo(() => arena?.walls.map(([x, y]) => {
    const c = arena.cell;
    return <View key={`${x},${y}`} style={[s.wall, { left: x * c + 1, top: y * c + 1, width: c - 2, height: c - 2, borderRadius: c * 0.22 }]} />;
  }), [arena]);

  const g = game;

  return (
    <View style={{ flex: 1 }}>
      <Header
        title={`Level ${level}`}
        sub={`${ARENAS[arenaKey].name} · ${speed(level)} moves/s`}
        back={exit}
        right={<RoundBtn icon={status === 'paused' ? 'play' : 'pause'} onPress={togglePause} />}
      />

      <View style={s.stats}>
        <Stat label="Score" value={score} />
        <Stat label="Best" value={Math.max(best, score)} />
        <View style={[s.stat, { flex: 1.3 }]}>
          <Text style={s.statLabel}>Food {eaten}/{TARGET}</Text>
          <View style={s.progress}><View style={[s.progressFill, { width: `${(eaten / TARGET) * 100}%` }]} /></View>
        </View>
      </View>

      <View style={s.boardSpace} onLayout={onBoardSpace}>
        {arena && g && (
          <View
            onTouchStart={(e) => (touch.current = [e.nativeEvent.pageX, e.nativeEvent.pageY])}
            onTouchEnd={onTouchEnd}
            style={[s.board, arena.wrap && s.boardOpen]}
          >
            <View style={{ width: arena.cell * arena.cols, height: arena.cell * arena.rows }}>
              {gridLayer}
              {wallLayer}
              <Food pos={g.food} cell={arena.cell} />
              <Snake snake={g.snake} dir={g.dir} cell={arena.cell} />
            </View>
            {status === 'ready' && (
              <View style={s.readyWrap} pointerEvents="none">
                <View style={s.readyPill}>
                  <Feather name="move" size={14} color={C.text} />
                  <Text style={s.readyText}>{settings.dpad ? 'Press an arrow to start' : 'Swipe to start'}</Text>
                </View>
              </View>
            )}
            {status !== 'ready' && status !== 'playing' && (
              <PlayOverlay
                status={status}
                score={score}
                best={Math.max(best, score)}
                level={level}
                resume={() => setStatus('playing')}
                restart={restart}
                exit={exit}
                next={next}
              />
            )}
          </View>
        )}
      </View>

      {settings.dpad && <DPad turn={turn} />}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function DPad({ turn }: { turn: (d: Cell) => void }) {
  const btn = (icon: IconName, d: Cell) => (
    <Pressable onPressIn={withTap(() => turn(d))} style={({ pressed }) => [s.dBtn, pressed && { backgroundColor: C.accent }]}>
      {({ pressed }) => <Feather name={icon} size={26} color={pressed ? C.accentInk : C.text} />}
    </Pressable>
  );
  return (
    <View style={s.dpad}>
      {btn('chevron-up', [0, -1])}
      <View style={{ flexDirection: 'row', gap: 64 }}>
        {btn('chevron-left', [-1, 0])}
        {btn('chevron-right', [1, 0])}
      </View>
      {btn('chevron-down', [0, 1])}
    </View>
  );
}

const s = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginBottom: 12 },
  stat: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, backgroundColor: C.card, justifyContent: 'center' },
  statLabel: { fontFamily: F.medium, fontSize: 13, color: C.muted },
  statValue: { fontFamily: F.bold, fontSize: 22, color: C.text, marginTop: 2 },
  progress: { height: 6, borderRadius: 3, backgroundColor: C.raised, overflow: 'hidden', marginTop: 10 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.food },

  boardSpace: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 12, marginBottom: 12 },
  board: { padding: 6, borderRadius: 26, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line },
  boardOpen: { borderStyle: 'dashed' },
  checker: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.022)' },
  wall: { position: 'absolute', backgroundColor: '#2C2C31' },

  readyWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 18 },
  readyPill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(31,31,34,0.92)' },
  readyText: { fontFamily: F.semibold, fontSize: 14, color: C.text },

  dpad: { alignItems: 'center', gap: 4, marginBottom: 16 },
  dBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
});
