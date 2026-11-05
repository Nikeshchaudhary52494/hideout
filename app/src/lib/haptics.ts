// One switch for all vibration in the app (game and chat), controlled by the game's Vibration setting.
import * as Haptics from 'expo-haptics';

let enabled = true;
export const setHapticsEnabled = (on: boolean) => {
  enabled = on;
};

const when = (fn: () => Promise<void>) => () => {
  if (enabled) fn().catch(() => {}); // devices without a vibration motor just ignore it
};

export const haptic = {
  tap: when(() => Haptics.selectionAsync()), // every button / row press
  light: when(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: when(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)), // long-press
  heavy: when(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: when(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: when(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: when(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

/** Wraps a press handler so it ticks first. */
export const withTap = <A extends unknown[]>(fn?: (...a: A) => void) => (...a: A) => {
  haptic.tap();
  fn?.(...a);
};
