import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { BackHandler, FlatList, Keyboard, KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { haptic } from '../../lib/haptics';
import { showDialog } from '../../ui/dialog';
import { RoundBtn } from '../../ui/buttons';
import { C, F } from '../../theme';
import { dayKey, dayLabel } from '../format';
import type { Img, Msg } from '../types';
import type { ChatApi } from '../useChat';
import { Avatar } from '../components/Avatar';
import { Bubble } from '../components/Bubble';
import { Composer } from '../components/Composer';
import { MessageMenu, type MenuAction } from '../components/MessageMenu';
import { PhotoViewer } from '../components/PhotoViewer';
import { cs } from '../styles';

const afterModal = (fn: () => void) => setTimeout(fn, 320); // let a closing modal finish first (iOS)

/** One conversation with `chat.peer`. */
export function Conversation({ chat, onLock }: { chat: ChatApi; onLock: () => void }) {
  const { me } = chat;
  const peer = chat.peer!;
  const name = chat.users[peer] ?? 'Unknown';
  const online = !!chat.online[peer];
  const typing = chat.typingFrom === peer;

  const msgs = useMemo(() => chat.msgs.filter((m) => m.peer === peer), [chat.msgs, peer]);
  const byId = useMemo(() => new Map(msgs.map((m) => [m.id, m])), [msgs]);
  const newestFirst = useMemo(() => [...msgs].reverse(), [msgs]); // the list is inverted

  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [selected, setSelected] = useState<Msg | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);

  // Android back button returns to the chat list
  const { closePeer } = chat;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { closePeer(); return true; });
    return () => sub.remove();
  }, [closePeer]);

  const send = (text: string, image: Img | null) => {
    if (editing) chat.editMessage(editing, text);
    else chat.sendMessage(peer, text, image, replyTo?.id);
    setReplyTo(null);
    setEditing(null);
  };

  const confirmDelete = (m: Msg) => showDialog('Delete message?', undefined, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete for me', style: 'destructive', onPress: () => chat.removeMessage(m, false) },
    ...(m.from === me ? [{ text: 'Delete for everyone', style: 'destructive' as const, onPress: () => chat.removeMessage(m, true) }] : []),
  ]);

  const actions: MenuAction[] = selected ? [
    { icon: 'corner-up-left', label: 'Reply', run: (m) => { setEditing(null); setReplyTo(m); afterModal(() => input.current?.focus()); } },
    ...(selected.from === me
      ? [{ icon: 'edit-2', label: 'Edit', run: (m: Msg) => { setReplyTo(null); setEditing(m); afterModal(() => input.current?.focus()); } } as MenuAction]
      : []),
    ...(selected.text ? [{ icon: 'copy', label: 'Copy', run: (m: Msg) => Clipboard.setStringAsync(m.text) } as MenuAction] : []),
    { icon: 'trash-2', label: 'Delete', danger: true, run: (m) => afterModal(() => confirmDelete(m)) },
  ] : [];

  const openMenu = (m: Msg) => {
    haptic.medium();
    Keyboard.dismiss();
    setSelected(m);
  };

  return (
    <KeyboardAvoidingView style={cs.flex} behavior="padding">
      <View style={s.header}>
        <RoundBtn icon="chevron-left" size={22} onPress={chat.closePeer} />
        <Avatar name={name} size={44} online={online} ring={C.card} />
        <View style={cs.flex}>
          <Text style={cs.name} numberOfLines={1}>{name}</Text>
          <Text style={[cs.status, typing && { color: C.accent }]}>
            {!chat.connected ? 'Connecting…' : typing ? 'typing…' : online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <RoundBtn icon="x" onPress={onLock} />
      </View>

      {msgs.length ? (
        <FlatList
          inverted
          data={newestFirst}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.list}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: m, index }) => {
            const older = newestFirst[index + 1];
            const newDay = !older || dayKey(older.ts) !== dayKey(m.ts);
            return (
              <View>
                {newDay && <DayDivider ts={m.ts} />}
                <Bubble
                  m={m}
                  me={me}
                  peerName={name}
                  reply={m.replyTo ? byId.get(m.replyTo) : undefined}
                  grouped={!newDay && older.from === m.from}
                  onLongPress={() => openMenu(m)}
                  onImage={() => m.image && setViewer(m.image.uri)}
                />
              </View>
            );
          }}
        />
      ) : (
        <View style={cs.empty}>
          <Avatar name={name} size={72} />
          <Text style={cs.emptyTitle}>Say hi to {name} 👋</Text>
          <Text style={cs.emptyText}>Messages are saved only on your phones.</Text>
        </View>
      )}

      <Composer
        me={me}
        peerName={name}
        replyTo={replyTo}
        editing={editing}
        inputRef={input}
        onCancel={() => { setReplyTo(null); setEditing(null); }}
        onSend={send}
        onTyping={() => chat.signalTyping(peer)}
      />

      <MessageMenu
        message={selected}
        me={me}
        peerName={name}
        reply={selected?.replyTo ? byId.get(selected.replyTo) : undefined}
        actions={actions}
        onReact={chat.react}
        onClose={() => setSelected(null)}
      />
      <PhotoViewer uri={viewer} onClose={() => setViewer(null)} />
    </KeyboardAvoidingView>
  );
}

function DayDivider({ ts }: { ts: number }) {
  return (
    <View style={s.day}>
      <View style={s.dayLine} />
      <Text style={s.dayText}>{dayLabel(ts)}</Text>
      <View style={s.dayLine} />
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 6, marginBottom: 4,
    padding: 10, borderRadius: 24, backgroundColor: C.card,
  },
  list: { paddingHorizontal: 12, paddingVertical: 8 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14, paddingHorizontal: 4 },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  dayText: { fontFamily: F.medium, fontSize: 13, color: C.muted },
});
