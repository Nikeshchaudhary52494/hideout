import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NAME_RULE } from '../../config';
import { RoundBtn } from '../../ui/buttons';
import { C, F } from '../../theme';
import { shortTime } from '../format';
import { preview } from '../protocol';
import type { Msg } from '../types';
import type { ChatApi } from '../useChat';
import { Avatar } from '../components/Avatar';
import { cs } from '../styles';

type PersonRow = { id: string; name: string; last?: Msg; unread: number; online: boolean };

/** My friends: online state, last message, unread count. The search box also adds friends by username. */
export function People({ chat, onLock }: { chat: ChatApi; onLock: () => void }) {
  const { me, username, users, friends, msgs, online, connected, error, notice, typingFrom } = chat;
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const rows = useMemo<PersonRow[]>(() => {
    const last: Record<string, Msg> = {};
    const unread: Record<string, number> = {};
    for (const m of msgs) {
      last[m.peer] = m;
      if (m.unread) unread[m.peer] = (unread[m.peer] ?? 0) + 1;
    }
    const q = query.trim().toLowerCase();
    return friends
      .filter((id) => id !== me && (users[id] ?? '').toLowerCase().includes(q))
      .map((id) => ({ id, name: users[id] ?? 'Unknown', last: last[id], unread: unread[id] ?? 0, online: !!online[id] }))
      // recent chats first, then who's online, then A–Z
      .sort((a, b) => (b.last?.ts ?? 0) - (a.last?.ts ?? 0) || Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  }, [friends, users, msgs, online, query, me]);

  // typing a username that isn't a friend yet offers to add it
  const typed = query.trim();
  const canAdd = NAME_RULE.test(typed) && typed.toLowerCase() !== (username ?? '').toLowerCase()
    && !rows.some((r) => r.name.toLowerCase() === typed.toLowerCase());
  const add = () => {
    chat.addFriend(typed);
    setQuery('');
  };
  const confirmRemove = (r: PersonRow) => Alert.alert(`Remove ${r.name}?`, 'Your messages stay on this phone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => chat.removeFriend(r.id) },
  ]);

  const saveName = () => {
    const n = nameDraft?.trim();
    if (n && n !== username) {
      if (NAME_RULE.test(n)) chat.rename(n);
      else Alert.alert('Invalid username', 'Use 2–20 letters, numbers, spaces, _ . or -');
    }
    setNameDraft(null);
  };

  const subtitle = (r: PersonRow) => {
    if (typingFrom === r.id) return 'typing…';
    if (r.last) return `${r.last.from === me ? 'You: ' : ''}${preview(r.last)}`;
    return r.online ? 'Online · say hi' : 'Tap to start chatting';
  };

  return (
    <View style={cs.flex}>
      <View style={s.header}>
        <Avatar name={username} size={44} online={connected} />
        <View style={cs.flex}>
          <Text style={s.small}>Signed in as</Text>
          {nameDraft !== null ? (
            <TextInput
              autoFocus
              value={nameDraft}
              onChangeText={setNameDraft}
              onEndEditing={saveName}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              style={[cs.name, s.nameInput]}
              selectionColor={C.accent}
            />
          ) : (
            <Text style={cs.name} numberOfLines={1} onPress={() => setNameDraft(username ?? '')}>{username ?? 'Tap to set a username'}</Text>
          )}
        </View>
        <RoundBtn icon="x" onPress={onLock} />
      </View>

      <Text style={s.title}>Chats</Text>

      <View style={s.search}>
        <Feather name="search" size={18} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={(t) => { setQuery(t); chat.clearNotice(); }}
          onSubmitEditing={() => canAdd && add()}
          placeholder="Search or add by username"
          placeholderTextColor={C.muted}
          selectionColor={C.accent}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={canAdd ? 'done' : 'search'}
          style={s.searchInput}
        />
      </View>

      {canAdd && (
        <Pressable onPress={add} style={({ pressed }) => [s.addRow, pressed && { opacity: 0.8 }]}>
          <View style={s.addIcon}><Feather name="user-plus" size={18} color={C.accentInk} /></View>
          <Text style={s.addText}>Add “{typed}” as a friend</Text>
        </Pressable>
      )}

      {(error || !connected) && (
        <View style={[s.notice, !!error && { borderColor: C.red }]}>
          <Feather name={error ? 'alert-circle' : 'wifi-off'} size={16} color={error ? C.red : C.muted} />
          <Text style={[s.noticeText, !!error && { color: C.red }]}>{error ?? 'Connecting to server…'}</Text>
        </View>
      )}
      {notice && (
        <View style={s.notice}>
          <Feather name="info" size={16} color={C.muted} />
          <Text style={s.noticeText}>{notice}</Text>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={(
          <View style={cs.empty}>
            <Text style={cs.emptyTitle}>{query ? 'No friends match' : 'No friends yet'}</Text>
            <Text style={cs.emptyText}>Type someone’s username above to add them.</Text>
          </View>
        )}
        renderItem={({ item: r }) => (
          <Pressable
            onPress={() => chat.openPeer(r.id)}
            onLongPress={() => confirmRemove(r)}
            style={({ pressed }) => [s.person, pressed && { backgroundColor: C.card }]}
          >
            <Avatar name={r.name} size={52} online={r.online} />
            <View style={cs.flex}>
              <View style={s.line}>
                <Text style={s.personName} numberOfLines={1}>{r.name}</Text>
                {r.last && <Text style={[s.time, r.unread > 0 && { color: C.accent }]}>{shortTime(r.last.ts)}</Text>}
              </View>
              <View style={s.line}>
                <Text
                  style={[s.last, r.unread > 0 && { color: C.text }, typingFrom === r.id && { color: C.accent }]}
                  numberOfLines={1}
                >
                  {subtitle(r)}
                </Text>
                {r.unread > 0 && <View style={s.badge}><Text style={s.badgeText}>{r.unread}</Text></View>}
              </View>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  small: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  nameInput: { padding: 0, margin: 0 },
  title: { fontFamily: F.bold, fontSize: 34, color: C.text, paddingHorizontal: 16, marginTop: 18, marginBottom: 12 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14,
    height: 46, borderRadius: 23, backgroundColor: C.card,
  },
  searchInput: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.text },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginVertical: 6, padding: 12,
    borderRadius: 16, borderWidth: 1, borderColor: C.line,
  },
  noticeText: { flex: 1, fontFamily: F.medium, fontSize: 14, color: C.muted },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginVertical: 6, padding: 10, borderRadius: 20, backgroundColor: C.card },
  addIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  addText: { flex: 1, fontFamily: F.semibold, fontSize: 15, color: C.text },
  person: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: 22 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  personName: { flex: 1, fontFamily: F.semibold, fontSize: 17, color: C.text },
  time: { fontFamily: F.medium, fontSize: 12, color: C.muted },
  last: { flex: 1, fontFamily: F.regular, fontSize: 14, color: C.muted, marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: F.bold, fontSize: 12, color: C.accentInk },
});
