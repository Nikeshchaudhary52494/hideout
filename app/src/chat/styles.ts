// Styles shared by the chat screens. Component-specific styles live next to the component.
import { StyleSheet } from 'react-native';
import { C, F } from '../theme';

export const cs = StyleSheet.create({
  flex: { flex: 1 },
  name: { fontFamily: F.semibold, fontSize: 18, color: C.text },
  status: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: F.semibold, fontSize: 20, color: C.text, textAlign: 'center', marginTop: 6 },
  emptyText: { fontFamily: F.regular, fontSize: 14, color: C.muted, textAlign: 'center' },
});
