import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { C } from '../../theme';
import { withTap } from '../../lib/haptics';

/** The six one-tap reactions. */
export const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

// Space-separated so multi-codepoint emoji (❤️‍🔥, ✌️) stay intact.
const EMOJIS = [...new Set((
  '😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 ' +
  '😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🤫 🤥 😶 😐 😑 😬 🙄 😯 ' +
  '😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👻 💀 👽 🤖 💩 😺 😸 😹 😻 😼 😽 🙀 😿 😾 ' +
  '👋 🤚 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 💪 👀 💋 ' +
  '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 💕 💞 💓 💗 💖 💘 💝 🔥 ✨ ⭐ 🌟 💫 🎉 🎊 🎁 🎂 🍕 🍔 🍟 🍿 ☕ 🍺 🍷 🍹 ' +
  '🌹 🌸 🌈 ☀️ 🌙 ⚡ 💯 ✅ ❌ ❓ ❗ 💤 💬 📷 🎵 🏠 ✈️ 🚗 ⚽ 🎮'
).split(' '))];

export function EmojiGrid({ onPick, height = 260 }: { onPick: (emoji: string) => void; height?: number }) {
  return (
    <ScrollView style={{ height, flexGrow: 0 }} contentContainerStyle={s.grid} keyboardShouldPersistTaps="always">
      {EMOJIS.map((e) => (
        <Pressable key={e} onPress={withTap(() => onPick(e))} style={({ pressed }) => [s.cell, pressed && { backgroundColor: C.raised }]}>
          <Text style={s.emoji}>{e}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 12 },
  cell: { width: '12.5%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  emoji: { fontSize: 28 },
});
