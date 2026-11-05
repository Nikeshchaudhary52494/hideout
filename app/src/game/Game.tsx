// The game shell: owns saved progress and switches between screens.
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { C } from '../theme';
import { setHapticsEnabled } from '../lib/haptics';
import { LEVELS } from './rules';
import { loadGame, recordRun, saveGame, type GameData, type Patch } from './progress';
import { buzz } from './useBuzz';
import { Fade } from './components/Fade';
import { Menu } from './screens/Menu';
import { Levels } from './screens/Levels';
import { Arenas } from './screens/Arenas';
import { Settings } from './screens/Settings';
import { Play } from './screens/Play';

export type Screen = 'menu' | 'levels' | 'arenas' | 'settings' | 'play';

export default function Game({ onUnlock }: { onUnlock: (username?: string) => void }) {
  const [data, setData] = useState<GameData>(loadGame);
  const [screen, setScreen] = useState<Screen>('menu');

  const update = (patch: Patch) => setData((d) => {
    const next = { ...d, ...(typeof patch === 'function' ? patch(d) : patch) };
    saveGame(next);
    return next;
  });
  // the Vibration setting switches haptics off everywhere, chat included
  useEffect(() => setHapticsEnabled(data.settings.haptics), [data.settings.haptics]);
  const go = (s: Screen) => setScreen(s); // the pressed button already ticked
  const menu = () => go('menu');
  const best = data.scores[0]?.score ?? 0;

  const render = () => {
    switch (screen) {
      case 'menu':
        return <Menu data={data} best={best} go={go} />;
      case 'levels':
        return <Levels data={data} back={menu} pick={(level) => { update({ level }); go('play'); }} locked={() => buzz('error')} />;
      case 'arenas':
        return <Arenas data={data} back={menu} pick={(arena) => { update({ arena }); menu(); }} />;
      case 'settings':
        return <Settings data={data} update={update} back={menu} buzz={buzz} onUnlock={onUnlock} />;
      case 'play':
        return (
          <Play
            key={`${data.level}-${data.arena}`}
            level={data.level}
            arenaKey={data.arena}
            settings={data.settings}
            best={best}
            buzz={buzz}
            exit={menu}
            onEnd={(score, cleared) => update(recordRun(score, cleared))}
            next={() => update((d) => ({ level: Math.min(LEVELS, d.level + 1) }))}
          />
        );
    }
  };

  return (
    <View style={s.root}>
      <Fade key={screen}>{render()}</Fade>
    </View>
  );
}

const s = StyleSheet.create({ root: { flex: 1, backgroundColor: C.bg } });
