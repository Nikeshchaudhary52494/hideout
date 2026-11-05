import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold } from '@expo-google-fonts/urbanist';
import Game from './src/game/Game';
import Chat from './src/chat/Chat';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { C } from './src/theme';
import { DialogHost } from './src/ui/dialog';
import { isAwayOnPurpose } from './src/lib/appLock';

// Keep the launch screen (dark + app icon) up until fonts are ready, then fade into the game.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 300 });

// Show the game-style nudges even while the app is open on the game screen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function App() {
  const [fontsLoaded] = useFonts({ Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold });
  const [unlocked, setUnlocked] = useState(false);
  const [newUsername, setNewUsername] = useState<string | null>(null); // set only right after first-time cheat code setup

  // Leaving the app hides the chat again (but not when we opened the photo picker / camera ourselves).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && !isAwayOnPurpose() && setUnlocked(false));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar style="light" />
        {unlocked ? (
          <Chat newUsername={newUsername} onLock={() => { setNewUsername(null); setUnlocked(false); }} />
        ) : (
          <Game onUnlock={(username?: string) => { setNewUsername(username || null); setUnlocked(true); }} />
        )}
        <DialogHost />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
