import '@/lib/i18n';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText, Button, Loading, Screen } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useAppFonts } from '@/lib/fonts';
import { SessionProvider, useSession } from '@/providers/session';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: palette.background, card: palette.background, text: palette.text },
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <SessionProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// Três estados: sem conta (onboarding e login), logado sem profissão (onboarding) e pronto (abas).
// Os links de retorno do login ficam fora das guardas para funcionar em qualquer estado.
function RootNavigator() {
  const { t } = useTranslation();
  const { loading, session, ready, loadError, refresh, signOut } = useSession();
  const fontsReady = useAppFonts();

  useEffect(() => {
    if (!loading && fontsReady) void SplashScreen.hideAsync();
  }, [loading, fontsReady]);

  if (!fontsReady) return null;
  if (loading) return <Loading label={t('setup.loading')} />;

  if (session && loadError && !ready) {
    return (
      <Screen contentStyle={{ justifyContent: 'center' }}>
        <AppText variant="subtitle">{t('errors.network')}</AppText>
        <Button title={t('common.retry')} onPress={() => void refresh()} />
        <Button title={t('settings.signOut')} variant="ghost" onPress={() => void signOut()} />
      </Screen>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!ready}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={ready}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="auth/reset" />
    </Stack>
  );
}
