import { Stack } from 'expo-router';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useOwl } from '../src/ui';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { db, trackForeground } from '../src/client';
import { useWorkspace } from '../src/store';

export default function Layout() {
  const [fontsReady, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Outfit_700Bold, Outfit_800ExtraBold });
  const c = useOwl();
  useEffect(() => {
    const { data } = db.auth.onAuthStateChange((event, session) => {
      useWorkspace.getState().sessionChanged(session, event === 'PASSWORD_RECOVERY' ? true : undefined);
    });
    const stop = trackForeground();
    async function accept(url: string | null) {
      if (!url || !url.startsWith('rondapak://')) return;
      const parsed = new URL(url);
      const hash = new URLSearchParams(parsed.hash.slice(1));
      const token = hash.get('access_token'), refresh = hash.get('refresh_token');
      if (token && refresh) {
        const result = await db.auth.setSession({ access_token: token, refresh_token: refresh });
        if (result.data.session && hash.get('type') === 'recovery') useWorkspace.getState().sessionChanged(result.data.session,true);
      } else if (parsed.searchParams.has('code')) {
        await db.auth.exchangeCodeForSession(parsed.searchParams.get('code')!);
      }
    }
    const links = Platform.OS === 'web' ? null : Linking.addEventListener('url', event => { void accept(event.url); });
    if (links) void Linking.getInitialURL().then(accept);
    return () => { data.subscription.unsubscribe(); stop?.(); links?.remove(); };
  }, []);
  if (!fontsReady && !fontError) return null;
  return <SafeAreaProvider>
    <StatusBar style={c.dark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
  </SafeAreaProvider>;
}
