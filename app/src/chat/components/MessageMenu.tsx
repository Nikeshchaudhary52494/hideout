import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { IconName } from '../../ui/buttons';
import { C, F } from '../../theme';
import type { Msg } from '../types';
import { Bubble } from './Bubble';
import { EmojiGrid, QUICK_REACTIONS } from './EmojiGrid';

export type MenuAction = { icon: IconName; label: string; danger?: boolean; run: (m: Msg) => void };

type Props = {
  message: Msg | null; // null = closed
  me: string;
  peerName: string;
  reply?: Msg;
  actions: MenuAction[];
  onReact: (m: Msg, emoji: string) => void;
  onClose: () => void;
};

/** Long-press menu: reaction bar, the message itself, and actions (reply, edit, copy, delete). */
export function MessageMenu({ message, me, peerName, reply, actions, onReact, onClose }: Props) {
  const [allEmoji, setAllEmoji] = useState(false);
  const close = () => { setAllEmoji(false); onClose(); };
  const react = (m: Msg, emoji: string) => { onReact(m, emoji); close(); };

  return (
    <Modal visible={!!message} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={close}>
        {message && (
          <View style={[s.wrap, { alignItems: message.from === me ? 'flex-end' : 'flex-start' }]} onStartShouldSetResponder={() => true}>
            {allEmoji ? (
              <View style={s.allEmoji}>
                <EmojiGrid height={300} onPick={(e) => react(message, e)} />
              </View>
            ) : (
              <View style={s.reactBar}>
                {QUICK_REACTIONS.map((e) => (
                  <Pressable key={e} onPress={() => react(message, e)} style={[s.reactBtn, message.reactions?.[me] === e && s.reactOn]}>
                    <Text style={s.reactEmoji}>{e}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setAllEmoji(true)} style={[s.reactBtn, s.reactOn]}>
                  <Feather name="plus" size={18} color={C.text} />
                </Pressable>
              </View>
            )}
            <Bubble m={message} me={me} peerName={peerName} reply={reply} />
            {!allEmoji && (
              <View style={s.menu}>
                {actions.map((a, i) => (
                  <Pressable
                    key={a.label}
                    onPress={() => { close(); a.run(message); }}
                    style={({ pressed }) => [s.item, i > 0 && s.divider, pressed && { backgroundColor: C.raised }]}
                  >
                    <Text style={[s.itemText, a.danger && { color: C.red }]}>{a.label}</Text>
                    <Feather name={a.icon} size={17} color={a.danger ? C.red : C.text} />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 16 },
  wrap: { gap: 10 },
  reactBar: { flexDirection: 'row', gap: 2, padding: 6, borderRadius: 30, backgroundColor: C.card },
  reactBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  reactOn: { backgroundColor: C.raised },
  reactEmoji: { fontSize: 26 },
  allEmoji: { width: '100%', borderRadius: 24, backgroundColor: C.card, paddingTop: 8 },
  menu: { width: 220, borderRadius: 18, backgroundColor: C.card, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  itemText: { fontFamily: F.medium, fontSize: 16, color: C.text },
});
