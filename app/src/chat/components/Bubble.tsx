import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F } from '../../theme';
import { fmtTime } from '../format';
import { preview } from '../protocol';
import type { Msg } from '../types';

const IMG_W = 236;
const LONG_PRESS_MS = 250;

type Props = {
  m: Msg;
  me: string;
  peerName: string;
  reply?: Msg; // the quoted message, if it still exists
  grouped?: boolean; // same sender as the message above: tighter spacing
  onLongPress?: () => void; // omitted in the read-only preview inside the message menu
  onImage?: () => void;
};

export function Bubble({ m, me, peerName, reply, grouped, onLongPress, onImage }: Props) {
  const mine = m.from === me;
  const reactions = Object.values(m.reactions ?? {});
  const unique = [...new Set(reactions)];
  const imgH = m.image ? Math.min(320, Math.max(120, (IMG_W * m.image.h) / m.image.w)) : 0;
  const time = fmtTime(m.ts);

  const meta = (
    <View style={[s.meta, m.text ? s.metaInline : s.metaOnImage]}>
      {m.edited && <Text style={s.metaText}>edited</Text>}
      <Text style={s.metaText}>{time}</Text>
      {mine && (
        <Ionicons
          name={m.status === 'pending' ? 'time-outline' : m.status === 'read' ? 'checkmark-done' : 'checkmark'}
          size={14}
          color={m.status === 'read' ? C.accent : C.muted}
        />
      )}
    </View>
  );

  // Time sits after the text when it fits, and wraps to its own right-aligned line when it doesn't.
  // (An invisible spacer copy of the time used to reserve room, but Android ignores transparent
  // nested text, so both copies showed up overlapping.)
  const textBlock = !!m.text && (
    <View style={s.textRow}>
      <Text style={s.text}>{m.text}</Text>
      {meta}
    </View>
  );

  return (
    <View style={[s.row, { alignItems: mine ? 'flex-end' : 'flex-start', marginTop: grouped ? 2 : 10 }, unique.length > 0 && { marginBottom: 16 }]}>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={LONG_PRESS_MS}
        disabled={!onLongPress}
        style={[s.bubble, mine ? s.out : s.in, m.image && s.imageBubble]}
      >
        {!!m.replyTo && (
          <View style={[s.quote, m.image && s.quoteOnImage]}>
            <Text style={s.quoteName}>{reply ? (reply.from === me ? 'You' : peerName) : ' '}</Text>
            <Text style={s.quoteText} numberOfLines={2}>{reply ? preview(reply) : 'Deleted message'}</Text>
          </View>
        )}
        {m.image && (
          <Pressable onPress={onImage} onLongPress={onLongPress} delayLongPress={LONG_PRESS_MS} disabled={!onImage}>
            <Image source={{ uri: m.image.uri }} style={{ width: IMG_W, height: imgH, borderRadius: 16 }} />
            {!m.text && meta}
          </Pressable>
        )}
        {m.image ? <View style={s.caption}>{textBlock}</View> : textBlock}
      </Pressable>
      {unique.length > 0 && (
        <View style={[s.reactions, mine ? { right: 10 } : { left: 10 }]}>
          <Text style={s.reactionText}>{unique.join('')}{reactions.length > unique.length ? ` ${reactions.length}` : ''}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { width: '100%' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  out: { backgroundColor: C.out, borderBottomRightRadius: 6 },
  in: { backgroundColor: C.in, borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  imageBubble: { padding: 4 },
  textRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'flex-end' },
  text: { flexShrink: 1, fontFamily: F.medium, fontSize: 16, lineHeight: 22, color: C.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaInline: { marginLeft: 10, marginBottom: 2, flexGrow: 1, justifyContent: 'flex-end' },
  metaOnImage: { position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)' },
  metaText: { fontFamily: F.medium, fontSize: 11, color: C.muted },
  caption: { paddingHorizontal: 10, paddingTop: 6, paddingBottom: 4 },

  quote: {
    borderLeftWidth: 3, borderLeftColor: C.accent, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6,
  },
  quoteOnImage: { margin: 4, marginBottom: 6 },
  quoteName: { fontFamily: F.semibold, fontSize: 13, color: C.accent },
  quoteText: { fontFamily: F.regular, fontSize: 14, color: '#C9C9D0', marginTop: 1 },

  reactions: {
    position: 'absolute', bottom: -15, paddingHorizontal: 7, height: 28, minWidth: 28, borderRadius: 14,
    backgroundColor: C.raised, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  reactionText: { fontFamily: F.semibold, fontSize: 14, color: C.text },
});
