import { StyleSheet, Text, View } from 'react-native';
import { C, F } from '../../theme';

const COLORS = ['#D8DEFF', '#FFD8E4', '#D8FFE8', '#FFF0C8', '#D8F4FF', '#EBD8FF'];
const colorFor = (name: string) => COLORS[[...name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % COLORS.length];

type Props = { name: string | null; size?: number; online?: boolean; ring?: string };

/** Initial on a pastel circle (color fixed per name), with an optional online dot. */
export function Avatar({ name, size = 46, online, ring = C.bg }: Props) {
  const n = name || '?';
  return (
    <View>
      <View style={[s.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(n) }]}>
        <Text style={[s.letter, { fontSize: size * 0.4 }]}>{n[0].toUpperCase()}</Text>
      </View>
      {online !== undefined && <View style={[s.dot, { borderColor: ring, backgroundColor: online ? C.green : '#4A4A50' }]} />}
    </View>
  );
}

const s = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: F.bold, color: C.accentInk },
  dot: { position: 'absolute', right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5 },
});
