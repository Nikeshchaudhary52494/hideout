// Drawing pieces shared by the game board, the menu demo and the arena previews.
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { ARENAS, N, START, type ArenaKey, type Cell } from '../rules';
import { C } from '../../theme';

export function Snake({ snake, dir, cell }: { snake: Cell[]; dir: Cell; cell: number }) {
  const len = snake.length;
  return snake.map((p, i) => (
    <View
      key={i}
      style={{
        position: 'absolute', left: p[0] * cell + 1, top: p[1] * cell + 1, width: cell - 2, height: cell - 2,
        borderRadius: cell * 0.34, backgroundColor: i === 0 ? C.accent : C.body, opacity: i === 0 ? 1 : 1 - (i / len) * 0.6,
      }}
    >
      {i === 0 && <Eyes dir={dir} cell={cell} />}
    </View>
  ));
}

function Eyes({ dir, cell }: { dir: Cell; cell: number }) {
  const e = Math.max(2.5, cell * 0.16);
  const off = cell * 0.2;
  // two eyes, toward the direction of travel
  const spots: Cell[] = dir[0] ? [[dir[0] * off, -off], [dir[0] * off, off]] : [[-off, dir[1] * off], [off, dir[1] * off]];
  const center = (cell - 2) / 2 - e / 2;
  return spots.map(([x, y], i) => (
    <View key={i} style={{ position: 'absolute', width: e, height: e, borderRadius: e, backgroundColor: C.accentInk, left: center + x, top: center + y }} />
  ));
}

export function Food({ pos, cell }: { pos: Cell; cell: number }) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const half = (toValue: number) => Animated.timing(pulse, { toValue, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([half(1), half(0)]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 0.92] });
  return (
    <Animated.View
      style={{ position: 'absolute', left: pos[0] * cell, top: pos[1] * cell, width: cell, height: cell, borderRadius: cell, backgroundColor: C.food, transform: [{ scale }] }}
    />
  );
}

export function ArenaPreview({ arena, size = 92 }: { arena: ArenaKey; size?: number }) {
  const a = ARENAS[arena];
  const c = size / N;
  return (
    <View style={[s.preview, { width: size, height: size }, a.wrap && s.open]}>
      {a.walls.map(([x, y]) => (
        <View key={`${x},${y}`} style={{ position: 'absolute', left: x * c, top: y * c, width: c, height: c, backgroundColor: C.muted, opacity: 0.55 }} />
      ))}
      {START.map(([x, y], i) => (
        <View key={i} style={{ position: 'absolute', left: x * c, top: y * c, width: c, height: c, borderRadius: c / 3, backgroundColor: i ? C.body : C.accent }} />
      ))}
    </View>
  );
}

/** The brand mark: three body segments and a bit of food. */
export function Mark({ size = 30 }: { size?: number }) {
  const c = size / 2 - 1.5;
  const sq: ViewStyle = { position: 'absolute', width: c, height: c, borderRadius: c * 0.32 };
  return (
    <View style={{ width: size, height: size }}>
      <View style={[sq, { left: 0, top: 0, backgroundColor: C.body }]} />
      <View style={[sq, { left: 0, bottom: 0, backgroundColor: C.body, opacity: 0.6 }]} />
      <View style={[sq, { right: 0, top: 0, backgroundColor: C.accent }]} />
      <View style={[sq, { right: c * 0.2, bottom: c * 0.2, width: c * 0.6, height: c * 0.6, borderRadius: c, backgroundColor: C.food }]} />
    </View>
  );
}

const s = StyleSheet.create({
  preview: { alignSelf: 'center', borderRadius: 12, backgroundColor: C.bg, overflow: 'hidden', borderWidth: 1.5, borderColor: C.line },
  open: { borderStyle: 'dashed' },
});
