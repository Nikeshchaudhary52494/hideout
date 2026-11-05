import { useState, type ComponentRef, type RefObject } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { C, F } from '../../theme';
import { haptic, withTap } from '../../lib/haptics';
import { showDialog } from '../../ui/dialog';
import { preview } from '../protocol';
import { shrink } from '../storage';
import type { Img, Msg } from '../types';
import { EmojiGrid } from './EmojiGrid';

type Props = {
  me: string;
  peerName: string;
  replyTo: Msg | null;
  editing: Msg | null;
  inputRef: RefObject<ComponentRef<typeof TextInput> | null>;
  onCancel: () => void; // drop the reply/edit banner
  onSend: (text: string, image: Img | null) => void;
  onTyping: () => void;
};

/** Message input: text, emoji panel, photo picking, and the reply / edit banners. */
export function Composer({ me, peerName, replyTo, editing, inputRef, onCancel, onSend, onTyping }: Props) {
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<Img | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // starting an edit loads the message text into the input (adjusting state on prop change, per React docs)
  const [loadedEdit, setLoadedEdit] = useState<Msg | null>(null);
  if (editing !== loadedEdit) {
    setLoadedEdit(editing);
    if (editing) {
      setText(editing.text);
      setDraft(null);
    }
  }

  const change = (t: string) => {
    setText(t);
    if (t) onTyping();
  };

  const cancel = () => {
    if (editing) setText('');
    onCancel();
  };

  const send = () => {
    const t = text.trim();
    if (!editing && !t && !draft) return;
    onSend(t, draft);
    setText('');
    setDraft(null);
  };

  const pickImage = async (camera: boolean) => {
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        return showDialog('Camera access is off', 'Turn it on in Settings to take photos.');
      }
      const launch = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const r = await launch({ mediaTypes: ['images'], quality: 1 });
      if (r.canceled) return;
      setDraft(await shrink(r.assets[0]));
      setEmojiOpen(false);
    } catch (err) {
      showDialog('Could not load photo', String((err as Error)?.message ?? err));
    }
  };

  const toggleEmoji = () => {
    haptic.tap();
    if (emojiOpen) {
      setEmojiOpen(false);
      inputRef.current?.focus();
    } else {
      Keyboard.dismiss();
      setEmojiOpen(true);
    }
  };

  const banner = editing ?? replyTo;
  const canSend = !!(text.trim() || draft || editing);

  return (
    <View>
      {banner && (
        <View style={s.banner}>
          <Feather name={editing ? 'edit-2' : 'corner-up-left'} size={16} color={C.accent} />
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>{editing ? 'Edit message' : `Reply to ${banner.from === me ? 'yourself' : peerName}`}</Text>
            <Text style={s.bannerText} numberOfLines={1}>{preview(banner)}</Text>
          </View>
          <Pressable onPress={withTap(cancel)} hitSlop={10}><Feather name="x" size={18} color={C.muted} /></Pressable>
        </View>
      )}

      {draft && (
        <View style={s.banner}>
          <Image source={{ uri: draft.uri }} style={s.draftImg} />
          <Text style={[s.bannerText, { flex: 1 }]}>Add a caption, or just send</Text>
          <Pressable onPress={withTap(() => setDraft(null))} hitSlop={10}><Feather name="x" size={18} color={C.muted} /></Pressable>
        </View>
      )}

      <View style={s.bar}>
        {!editing && (
          <Pressable onPress={withTap(() => pickImage(false))} hitSlop={8}>
            <Feather name="paperclip" size={20} color={C.muted} />
          </Pressable>
        )}
        <TextInput
          ref={inputRef}
          style={s.input}
          value={text}
          onChangeText={change}
          onFocus={() => setEmojiOpen(false)}
          placeholder="Write a message"
          placeholderTextColor={C.muted}
          selectionColor={C.accent}
          multiline
        />
        <Pressable onPress={toggleEmoji} hitSlop={8}>
          <Feather name={emojiOpen ? 'type' : 'smile'} size={20} color={emojiOpen ? C.accent : C.muted} />
        </Pressable>
        {canSend ? (
          <Pressable onPress={withTap(send)} style={s.send}>
            <Feather name={editing ? 'check' : 'arrow-up'} size={20} color={C.accentInk} />
          </Pressable>
        ) : (
          <Pressable onPress={withTap(() => pickImage(true))} hitSlop={8} style={s.camera}>
            <Feather name="camera" size={20} color={C.muted} />
          </Pressable>
        )}
      </View>
      {emojiOpen && <EmojiGrid onPick={(e) => setText((t) => t + e)} />}
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: C.card,
  },
  bannerTitle: { fontFamily: F.semibold, fontSize: 13, color: C.accent },
  bannerText: { fontFamily: F.regular, fontSize: 14, color: C.muted },
  draftImg: { width: 44, height: 44, borderRadius: 10 },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginBottom: 8,
    paddingLeft: 16, paddingRight: 6, minHeight: 54, borderRadius: 27, borderWidth: 1, borderColor: C.line, backgroundColor: C.card,
  },
  input: { flex: 1, fontFamily: F.medium, fontSize: 16, color: C.text, maxHeight: 120, paddingVertical: 10 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  camera: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
});
