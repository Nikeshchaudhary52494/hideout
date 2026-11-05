import { Image, Modal, StyleSheet, View } from 'react-native';
import { RoundBtn } from '../../ui/buttons';

/** Full-screen photo. `uri` null = closed. */
export function PhotoViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        {uri && <Image source={{ uri }} style={{ flex: 1 }} resizeMode="contain" />}
        <View style={s.close}><RoundBtn icon="x" size={22} onPress={onClose} /></View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', top: 56, right: 20 },
});
