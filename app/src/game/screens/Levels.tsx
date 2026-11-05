import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../../theme';
import { LEVELS, TARGET, speed } from '../rules';
import type { GameData } from '../progress';
import { Header } from '../components/Header';
import { gs } from '../styles';

type Props = { data: GameData; back: () => void; pick: (lvl: number) => void; locked: () => void };

export function Levels({ data, back, pick, locked }: Props) {
  return (
    <View style={{ flex: 1 }}>
      <Header title="Levels" sub={`${data.cleared.length} of ${LEVELS} cleared`} back={back} />
      <ScrollView contentContainerStyle={gs.grid}>
        {Array.from({ length: LEVELS }, (_, i) => {
          const lvl = i + 1;
          const open = lvl <= data.unlocked;
          const done = data.cleared.includes(lvl);
          const current = lvl === data.level;
          const ink = current ? C.accentInk : undefined;
          return (
            <Pressable
              key={lvl}
              onPress={() => (open ? pick(lvl) : locked())}
              style={({ pressed }) => [s.tile, current && s.current, !open && { opacity: 0.4 }, pressed && open && gs.pressed]}
            >
              <View style={s.top}>
                <Text style={[s.num, ink && { color: ink }]}>{lvl}</Text>
                <View style={[s.icon, current && s.iconOnCurrent]}>
                  <Feather name={done ? 'check' : open ? 'play' : 'lock'} size={14} color={ink ?? C.text} />
                </View>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${lvl * 10}%` }, ink && { backgroundColor: ink }]} />
              </View>
              <Text style={[s.meta, ink && { color: ink }]}>{done ? 'Cleared' : open ? `${speed(lvl)} moves/s` : 'Locked'}</Text>
            </Pressable>
          );
        })}
        <Text style={gs.footnote}>Eat {TARGET} to clear a level and unlock the next one. Each level is faster.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tile: { width: '47.8%', padding: 16, borderRadius: 26, backgroundColor: C.card, gap: 14 },
  current: { backgroundColor: C.accent },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  num: { fontFamily: F.bold, fontSize: 34, color: C.text },
  icon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' },
  iconOnCurrent: { backgroundColor: 'rgba(14,18,48,0.12)' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: C.body },
  meta: { fontFamily: F.medium, fontSize: 13, color: C.muted },
});
