import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { stackScreenOptions } from '@/constants/navigation';
import { useTheme } from '@/constants/theme';

export default function AppLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ ...stackScreenOptions(theme), headerBackTitle: t('common.back') }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="card/[id]" options={{ title: '' }} />
      <Stack.Screen name="report/[cardId]" options={{ presentation: 'modal', title: t('report.title') }} />
      <Stack.Screen name="premium" options={{ presentation: 'modal', title: '' }} />
      <Stack.Screen name="add-area" options={{ presentation: 'modal', title: t('addArea.title') }} />
    </Stack>
  );
}
