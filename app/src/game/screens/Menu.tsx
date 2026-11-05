import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { RoundBtn } from '../../ui/buttons';
import { C, F } from '../../theme';
import { ARENAS, DEMO, LEVELS, N, autopilot, fresh, speed, step } from '../rules';
import type { GameData } from '../progress';
import { Food, Mark, Snake } from '../components/Board';
import { Row } from '../components/Row';
import { gs } from '../styles';
import type { Screen } from '../Game';

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString([], { day: 'numeric', month: 'short' });

type Props = { data: GameData; best: number; go: (s: Screen) => void };

export function Menu({ data, best, go }: Props) {
  const { width } = useWindowDimensions();

  return (
    <ScrollView contentContainerStyle={s.menu} showsVerticalScrollIndicator={false}>
      <View style={s.top}>
        <Mark />
        <Text style={s.wordmark}>Snake Game 2</Text>
        <RoundBtn icon="settings" onPress={() => go('settings')} />
      </View>

      <Pressable onPress={() => go('play')} style={s.hero}>
        <Demo size={Math.min(width - 64, 340)} />
        <View style={s.heroFoot}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>Level {data.level}</Text>
            <Text style={s.heroSub}>{ARENAS[data.arena].name} · {speed(data.level)} moves/s</Text>
          </View>
          <View style={s.play}>
            <Feather name="play" size={18} color={C.accentInk} />
            <Text style={s.playText}>Play</Text>
          </View>
        </View>
      </Pressable>

      <View style={gs.card}>
        <Row icon="layers" label="Level" value={`${data.level} of ${LEVELS}`} onPress={() => go('levels')}>
          <View style={s.segments}>
            {Array.from({ length: LEVELS }, (_, i) => (
              <View
                key={i}
                style={[s.segment, i < data.unlocked && s.segmentOpen, data.cleared.includes(i + 1) && s.segmentDone]}
              />
            ))}
          </View>
        </Row>
        <Row icon="grid" label="Play area" value={ARENAS[data.arena].name} onPress={() => go('arenas')} />
      </View>

      <View style={gs.card}>
        <View style={s.cardHead}>
          <Text style={s.cardTitle}>High scores</Text>
          <View style={s.pill}>
            <Feather name="award" size={14} color={C.text} />
            <Text style={s.pillText}>{best}</Text>
          </View>
        </View>
        {data.scores.length === 0 ? (
          <Text style={s.empty}>No runs yet. Your best five will show up here.</Text>
        ) : data.scores.slice(0, 5).map((sc, i) => (
          <View key={sc.ts} style={s.scoreRow}>
            <View style={[s.rank, i === 0 && { backgroundColor: C.accent }]}>
              <Text style={[s.rankText, i === 0 && { color: C.accentInk }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.scoreName}>{ARENAS[sc.arena]?.name}</Text>
              <Text style={s.scoreMeta}>Level {sc.level} · {fmtDate(sc.ts)}</Text>
            </View>
            <Text style={s.scoreVal}>{sc.score}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/** A snake playing by itself: the menu's centerpiece. */
function Demo({ size }: { size: number }) {
  const cell = size / N;
  const [game, setGame] = useState(() => fresh(DEMO));
  useEffect(() => {
    const t = setInterval(() => setGame((cur) => {
      const next = step({ ...cur, dir: autopilot(cur) }, DEMO);
      return next.dead || next.snake.length > 22 ? fresh(DEMO) : next; // start over before it fills the board
    }), 130);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Food pos={game.food} cell={cell} />
      <Snake snake={game.snake} dir={game.dir} cell={cell} />
    </View>
  );
}

const s = StyleSheet.create({
  menu: { padding: 16, paddingBottom: 32, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, marginBottom: 4 },
  wordmark: { flex: 1, fontFamily: F.semibold, fontSize: 28, color: C.text },

  hero: { borderRadius: 32, backgroundColor: C.card, padding: 16, alignItems: 'center', gap: 16 },
  heroFoot: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: 12, paddingLeft: 4 },
  heroTitle: { fontFamily: F.bold, fontSize: 26, color: C.text },
  heroSub: { fontFamily: F.medium, fontSize: 14, color: C.muted, marginTop: 2 },
  play: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 24, borderRadius: 26, backgroundColor: C.accent },
  playText: { fontFamily: F.bold, fontSize: 17, color: C.accentInk },

  segments: { flexDirection: 'row', gap: 3, marginTop: 8, marginRight: 8 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: C.line },
  segmentOpen: { backgroundColor: C.body, opacity: 0.45 },
  segmentDone: { backgroundColor: C.accent, opacity: 1 },

  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
  cardTitle: { fontFamily: F.semibold, fontSize: 17, color: C.text },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: C.raised },
  pillText: { fontFamily: F.semibold, fontSize: 14, color: C.text },
  empty: { fontFamily: F.regular, fontSize: 14, color: C.muted, paddingHorizontal: 10, paddingBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 10, paddingVertical: 8 },
  rank: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: F.bold, fontSize: 15, color: C.text },
  scoreName: { fontFamily: F.semibold, fontSize: 16, color: C.text },
  scoreMeta: { fontFamily: F.regular, fontSize: 13, color: C.muted, marginTop: 1 },
  scoreVal: { fontFamily: F.bold, fontSize: 18, color: C.text },
});
