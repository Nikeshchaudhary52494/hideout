import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RoundBtn } from '../../ui/buttons';
import { C, F } from '../../theme';

type Props = { title: string; sub?: string; back: () => void; right?: ReactNode };

/** Card-style screen header: back button, title + subtitle, optional right action. */
export function Header({ title, sub, back, right }: Props) {
  return (
    <View style={s.header}>
      <RoundBtn icon="chevron-left" size={22} onPress={back} />
      <View style={{ flex: 1 }}>
        <Text style={s.title}>{title}</Text>
        {sub && <Text style={s.sub}>{sub}</Text>}
      </View>
      {right || <View style={{ width: 40 }} />}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 6, marginBottom: 12,
    padding: 10, borderRadius: 24, backgroundColor: C.card,
  },
  title: { fontFamily: F.semibold, fontSize: 18, color: C.text },
  sub: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 1 },
});
