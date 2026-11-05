// Styles shared by several game screens. Component-specific styles live next to the component.
import { StyleSheet } from 'react-native';
import { C, F } from '../theme';

export const gs = StyleSheet.create({
  card: { borderRadius: 28, backgroundColor: C.card, padding: 8, gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, paddingBottom: 32 },
  footnote: { width: '100%', fontFamily: F.medium, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  pressed: { transform: [{ scale: 0.97 }] },
});
