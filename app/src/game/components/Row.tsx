import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { IconName } from '../../ui/buttons';
import { C, F } from '../../theme';

type Props = {
  icon: IconName;
  label: string;
  sub?: string;
  value?: string;
  color?: string; // label + icon color, e.g. red for destructive rows
  onPress?: () => void;
  right?: ReactNode; // replaces the chevron (e.g. a Switch)
  children?: ReactNode; // extra content under the label
};

/** List row inside a card: round icon, label, optional value, chevron. */
export function Row({ icon, label, sub, value, color = C.text, onPress, right, children }: Props) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.row, pressed && s.pressed]}>
      <View style={s.icon}><Feather name={icon} size={18} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[s.label, { color }]}>{label}</Text>
        {sub && <Text style={s.sub}>{sub}</Text>}
        {children}
      </View>
      {value && <Text style={s.value}>{value}</Text>}
      {right ?? (onPress && <Feather name="chevron-right" size={18} color={C.muted} />)}
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 20, backgroundColor: C.raised },
  pressed: { backgroundColor: C.pressed },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: F.semibold, fontSize: 16 },
  sub: { fontFamily: F.regular, fontSize: 13, color: C.muted, marginTop: 1 },
  value: { fontFamily: F.medium, fontSize: 14, color: C.muted },
});
