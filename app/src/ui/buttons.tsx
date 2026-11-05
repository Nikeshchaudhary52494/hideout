import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { C, F } from '../theme';

export type IconName = ComponentProps<typeof Feather>['name'];

type BtnProps = { label: string; icon?: IconName; onPress: () => void; kind?: 'primary' | 'secondary'; style?: StyleProp<ViewStyle> };

/** Pill button: lavender primary, dark secondary. */
export function Btn({ label, icon, onPress, kind = 'primary', style }: BtnProps) {
  const primary = kind === 'primary';
  const color = primary ? C.accentInk : C.text;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, primary ? s.primary : s.secondary, pressed && s.pressed, style]}>
      {icon && <Feather name={icon} size={18} color={color} />}
      <Text style={[s.text, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** 40pt round icon button used in headers. */
export function RoundBtn({ icon, onPress, size = 20 }: { icon: IconName; onPress: () => void; size?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.round, pressed && s.pressed]} hitSlop={8}>
      <Feather name={icon} size={size} color={C.text} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, paddingHorizontal: 22, borderRadius: 26 },
  primary: { backgroundColor: C.accent },
  secondary: { backgroundColor: C.raised },
  text: { fontFamily: F.semibold, fontSize: 16 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.97 }] },
});
