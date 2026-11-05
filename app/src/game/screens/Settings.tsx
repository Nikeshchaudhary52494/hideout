import { useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { C } from '../../theme';
import type { IconName } from '../../ui/buttons';
import type { GameData, Patch, Settings as SettingsData } from '../progress';
import type { Buzz } from '../useBuzz';
import { CheatModal } from '../components/CheatModal';
import { Header } from '../components/Header';
import { Row } from '../components/Row';
import { gs } from '../styles';

const TOGGLES: { k: keyof SettingsData; icon: IconName; label: string; sub?: string }[] = [
  { k: 'haptics', icon: 'smartphone', label: 'Vibration' },
  { k: 'grid', icon: 'hash', label: 'Board grid' },
  { k: 'dpad', icon: 'move', label: 'Arrow buttons', sub: 'Instead of swiping' },
];

type Props = { data: GameData; update: (p: Patch) => void; back: () => void; buzz: Buzz; onUnlock: (username?: string) => void };

export function Settings({ data, update, back, buzz, onUnlock }: Props) {
  const [cheat, setCheat] = useState(false);
  const toggle = (k: keyof SettingsData, v: boolean) => {
    update((d) => ({ settings: { ...d.settings, [k]: v } }));
    buzz();
  };
  const reset = () => Alert.alert('Reset progress?', 'Levels and high scores will be cleared.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: () => update({ level: 1, unlocked: 1, cleared: [], scores: [] }) },
  ]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Settings" back={back} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <View style={gs.card}>
          {TOGGLES.map((t) => (
            <Row
              key={t.k}
              icon={t.icon}
              label={t.label}
              sub={t.sub}
              right={(
                <Switch
                  value={data.settings[t.k]}
                  onValueChange={(v) => toggle(t.k, v)}
                  trackColor={{ true: C.accent, false: C.line }}
                  thumbColor={data.settings[t.k] ? C.accentInk : C.muted}
                  ios_backgroundColor={C.line}
                />
              )}
            />
          ))}
        </View>
        <View style={gs.card}>
          <Row icon="terminal" label="Cheat codes" onPress={() => setCheat(true)} />
          <Row icon="rotate-ccw" label="Reset progress" color={C.red} onPress={reset} right={null} />
        </View>
        <Text style={gs.footnote}>Snake Game 2 · v1.0</Text>
      </ScrollView>
      <CheatModal
        visible={cheat}
        codeHash={data.codeHash}
        close={() => setCheat(false)}
        saveCode={(codeHash) => update({ codeHash })}
        buzz={buzz}
        onUnlock={onUnlock}
      />
    </View>
  );
}
