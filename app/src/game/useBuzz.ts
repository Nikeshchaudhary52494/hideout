import { haptic } from '../lib/haptics';

export type Buzz = (kind?: 'light' | 'heavy' | 'success' | 'error') => void;

/** Game-event vibration (eating, dying, clearing a level). Respects the Vibration setting via lib/haptics. */
export const buzz: Buzz = (kind = 'light') => haptic[kind]();
