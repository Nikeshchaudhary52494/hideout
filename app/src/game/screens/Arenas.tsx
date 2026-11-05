import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../../theme';
import { ARENAS, ARENA_KEYS, type ArenaKey } from '../rules';
import type { GameData } from '../progress';
import { ArenaPreview } from '../components/Board';
import { Header } from '../components/Header';
import { gs } from '../styles';

type Props = { data: GameData; back: () => void; pick: (key: ArenaKey) => void };

export function Arenas({ data, back, pick }: Props) {
  const { width } = useWindowDimensions();
  const preview = Math.floor((width - 32 - 12) / 2) - 28; // two cards per row
  return (
    <View style={{ flex: 1 }}>
      <Header title="Play area" sub={ARENAS[data.arena].name} back={back} />
      <ScrollView contentContainerStyle={gs.grid}>
        {ARENA_KEYS.map((key) => {
          const on = data.arena === key;
          return (
            <Pressable key={key} onPress={() => pick(key)} style={({ pressed }) => [s.card, on && s.on, pressed && gs.pressed]}>
              <ArenaPreview arena={key} size={preview} />
              <View style={s.head}>
                <Text style={s.name}>{ARENAS[key].name}</Text>
                {on && <View style={s.check}><Feather name="check" size={12} color={C.accentInk} /></View>}
              </View>
              <Text style={s.desc}>{ARENAS[key].desc}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: { width: '47.8%', padding: 14, borderRadius: 26, backgroundColor: C.card, gap: 8, borderWidth: 1.5, borderColor: 'transparent' },
  on: { borderColor: C.accent },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  name: { fontFamily: F.semibold, fontSize: 15, color: C.text },
  desc: { fontFamily: F.regular, fontSize: 13, color: C.muted, lineHeight: 17 },
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
});
