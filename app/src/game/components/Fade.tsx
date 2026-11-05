import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing } from 'react-native';

/** Fades and lifts its children in on mount; used for screen changes. */
export function Fade({ children }: { children: ReactNode }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return <Animated.View style={{ flex: 1, opacity: a, transform: [{ translateY }] }}>{children}</Animated.View>;
}
