import { StyleSheet, Text, View } from 'react-native';
import { Btn } from '../../ui/buttons';
import { LEVELS } from '../rules';
import { C, F } from '../../theme';

type Props = {
  status: 'paused' | 'over' | 'cleared';
  score: number;
  best: number;
  level: number;
  resume: () => void;
  restart: () => void;
  exit: () => void;
  next: () => void;
};

/** Card over the board for pause, game over and level cleared. */
export function PlayOverlay({ status, score, best, level, resume, restart, exit, next }: Props) {
  const newBest = status !== 'paused' && score > 0 && score >= best;
  const title = { paused: 'Paused', over: 'Game over', cleared: `Level ${level} cleared` }[status];
  return (
    <View style={s.overlay}>
      <View style={s.card}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.score}>{score}</Text>
        <Text style={s.sub}>{newBest ? 'New best score' : `Best ${best}`}</Text>
        <View style={s.btns}>
          {status === 'paused' && <Btn label="Resume" icon="play" onPress={resume} />}
          {status === 'over' && <Btn label="Try again" icon="rotate-ccw" onPress={restart} />}
          {status === 'cleared' && (level < LEVELS
            ? <Btn label={`Level ${level + 1}`} icon="arrow-right" onPress={next} />
            : <Btn label="Play again" icon="rotate-ccw" onPress={restart} />)}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {status !== 'over' && <Btn label="Restart" kind="secondary" onPress={restart} style={{ flex: 1 }} />}
            <Btn label="Menu" kind="secondary" onPress={exit} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, borderRadius: 24, backgroundColor: 'rgba(11,11,12,0.7)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { alignSelf: 'stretch', borderRadius: 28, backgroundColor: C.card, padding: 20, alignItems: 'center' },
  title: { fontFamily: F.semibold, fontSize: 17, color: C.muted },
  score: { fontFamily: F.bold, fontSize: 56, color: C.text, marginVertical: 2 },
  sub: { fontFamily: F.medium, fontSize: 14, color: C.muted, marginBottom: 18 },
  btns: { alignSelf: 'stretch', gap: 10 },
});
