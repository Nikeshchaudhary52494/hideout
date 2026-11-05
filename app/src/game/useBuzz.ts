import * as Haptics from 'expo-haptics';

export type Buzz = (kind?: 'light' | 'heavy' | 'success' | 'error') => void;

/** Haptic feedback that respects the Vibration setting. */
export const makeBuzz = (enabled: boolean): Buzz => (kind = 'light') => {
  if (!enabled) return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else Haptics.impactAsync(kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);
};
