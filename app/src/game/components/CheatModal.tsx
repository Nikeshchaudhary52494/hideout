import { useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Btn } from '../../ui/buttons';
import { NAME_RULE } from '../../config';
import { C, F } from '../../theme';
import { hashCode } from '../progress';
import type { Buzz } from '../useBuzz';

type Props = {
  visible: boolean;
  codeHash: string | null;
  close: () => void;
  saveCode: (hash: string) => void;
  buzz: Buzz;
  onUnlock: (username?: string) => void; // username only on first-time setup
};

/**
 * The secret door. Looks like an ordinary cheat-code box.
 * Code already set: one step. First time ever: code → confirm code → username.
 */
export function CheatModal({ visible, codeHash, close, saveCode, buzz, onUnlock }: Props) {
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<'code' | 'confirm' | 'name'>('code');
  const [first, setFirst] = useState<string | null>(null); // hash of the new code, until confirmed
  const [msg, setMsg] = useState({ text: '', error: false });
  const [shake] = useState(() => new Animated.Value(0));

  const say = (text: string, error = false) => setMsg({ text, error });
  const wobble = (text: string) => {
    say(text, true);
    buzz('error');
    shake.setValue(0);
    Animated.timing(shake, { toValue: 1, duration: 360, easing: Easing.linear, useNativeDriver: true }).start();
  };
  const reset = () => {
    setValue(''); setStage('code'); setFirst(null); say('');
    close();
  };
  const unlock = (username?: string) => {
    buzz('success');
    reset();
    onUnlock(username);
  };

  const submit = async () => {
    const input = value.trim();
    if (!input) return;
    if (stage === 'name') {
      if (!NAME_RULE.test(input)) return wobble('Use 2–20 letters, numbers, spaces, _ . or -');
      if (first) saveCode(first);
      return unlock(input);
    }
    const h = await hashCode(input);
    setValue('');
    if (codeHash) return h === codeHash ? unlock() : wobble('That code doesn’t do anything');
    if (stage === 'code') {
      setFirst(h);
      setStage('confirm');
      return say('Enter it once more to confirm');
    }
    if (h !== first) {
      setFirst(null);
      setStage('code');
      return wobble('Codes didn’t match. Start again');
    }
    setStage('name');
    say('This is the name others will see');
  };

  const naming = stage === 'name';
  const translateX = shake.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -10, 10, -6, 6, 0] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={reset} statusBarTranslucent>
      <Pressable style={s.back} onPress={reset}>
        <Animated.View style={[s.card, { transform: [{ translateX }] }]} onStartShouldSetResponder={() => true}>
          <View style={s.icon}>
            <Feather name={naming ? 'user' : 'terminal'} size={22} color={C.accentInk} />
          </View>
          <Text style={s.title}>{naming ? 'Choose a username' : 'Cheat code'}</Text>
          <TextInput
            key={stage === 'name' ? 'name' : 'code'}
            value={value}
            onChangeText={setValue}
            onSubmitEditing={submit}
            autoFocus
            secureTextEntry={!naming}
            autoCapitalize={naming ? 'none' : 'characters'}
            autoCorrect={false}
            placeholder={naming ? 'username' : 'Enter code'}
            placeholderTextColor={C.muted}
            selectionColor={C.accent}
            style={s.input}
          />
          <Text style={[s.msg, msg.error && { color: C.red }]}>{msg.text || ' '}</Text>
          <Btn label={naming ? 'Continue' : 'Apply'} onPress={submit} style={{ alignSelf: 'stretch' }} />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 20 },
  card: { borderRadius: 32, backgroundColor: C.card, padding: 20, paddingTop: 24, alignItems: 'center', gap: 14 },
  icon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.semibold, fontSize: 20, color: C.text },
  input: {
    alignSelf: 'stretch', height: 54, borderRadius: 27, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg,
    paddingHorizontal: 20, color: C.text, fontFamily: F.semibold, fontSize: 17, textAlign: 'center',
  },
  msg: { fontFamily: F.medium, fontSize: 13, color: C.muted, marginTop: -4 },
});
