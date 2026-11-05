// Themed replacement for Alert.alert (Android's system dialog can't be styled).
// Mount <DialogHost /> once at the app root, then call showDialog(...) from anywhere.
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { C, F } from '../theme';

export type DialogButton = { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void };
type Dialog = { title: string; message?: string; buttons: DialogButton[] };

let present: ((d: Dialog) => void) | null = null;

/** Same arguments as Alert.alert. */
export function showDialog(title: string, message?: string, buttons: DialogButton[] = [{ text: 'OK' }]) {
  haptic.light();
  present?.({ title, message, buttons });
}

export function DialogHost() {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  useEffect(() => {
    present = setDialog;
    return () => {
      present = null;
    };
  }, []);

  const cancel = dialog?.buttons.find((b) => b.style === 'cancel');
  const actions = dialog?.buttons.filter((b) => b.style !== 'cancel') ?? [];
  const close = (b?: DialogButton) => {
    setDialog(null);
    b?.onPress?.();
  };

  return (
    <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(cancel)} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={() => close(cancel)}>
        {dialog && (
          <View style={s.card} onStartShouldSetResponder={() => true}>
            <Text style={s.title}>{dialog.title}</Text>
            {!!dialog.message && <Text style={s.message}>{dialog.message}</Text>}
            <View style={s.buttons}>
              {/* actions first (stacked, full width), cancel last */}
              {[...actions, ...(cancel ? [cancel] : [])].map((b) => (
                <Pressable
                  key={b.text}
                  onPress={() => { haptic.tap(); close(b); }}
                  style={({ pressed }) => [s.btn, styleFor(b, actions.length), pressed && s.pressed]}
                >
                  <Text style={[s.btnText, textFor(b, actions.length)]}>{b.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Pressable>
    </Modal>
  );
}

// A lone non-destructive action is the primary (lavender) button; destructive ones are red on dark.
const styleFor = (b: DialogButton, nActions: number) =>
  b.style === 'cancel' ? s.cancel : b.style === 'destructive' ? s.destructive : nActions === 1 ? s.primary : s.secondary;
const textFor = (b: DialogButton, nActions: number) =>
  b.style === 'cancel' ? { color: C.muted } : b.style === 'destructive' ? { color: C.red } : nActions === 1 ? { color: C.accentInk } : { color: C.text };

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 28, backgroundColor: C.card, padding: 20, paddingTop: 24 },
  title: { fontFamily: F.semibold, fontSize: 20, color: C.text, textAlign: 'center' },
  message: { fontFamily: F.regular, fontSize: 15, lineHeight: 21, color: C.muted, textAlign: 'center', marginTop: 8 },
  buttons: { gap: 8, marginTop: 20 },
  btn: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: C.accent },
  secondary: { backgroundColor: C.raised },
  destructive: { backgroundColor: C.raised },
  cancel: { backgroundColor: 'transparent' },
  btnText: { fontFamily: F.semibold, fontSize: 16 },
  pressed: { opacity: 0.75 },
});
