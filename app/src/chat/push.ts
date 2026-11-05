import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import { awayOnPurpose } from '../lib/appLock';

/**
 * Expo push token, or null where push isn't possible (Expo Go on Android, permission denied, no EAS project).
 * The server only ever sends game-style nudges to it, never message content.
 */
export async function getPushToken(): Promise<string | null> {
  if (isRunningInExpoGo() && Platform.OS === 'android') return null; // removed from Expo Go on Android
  try {
    if (Platform.OS === 'android') {
      // the channel name shows in Android settings, so it stays in character too.
      // eslint-disable-next-line import/namespace -- false positive: AndroidImportance is re-exported via `export *`
      await Notifications.setNotificationChannelAsync('default', { name: 'Game updates', importance: Notifications.AndroidImportance.DEFAULT });
    }
    let { status } = await Notifications.getPermissionsAsync();
    // the system prompt can background the app; it's ours, so it mustn't lock the chat
    if (status !== 'granted') ({ status } = await awayOnPurpose(Notifications.requestPermissionsAsync));
    if (status !== 'granted') return null;
    return (await Notifications.getExpoPushTokenAsync()).data;
  } catch (err) {
    console.warn('push unavailable:', (err as Error)?.message);
    return null;
  }
}
