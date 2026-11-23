import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { stackScreenOptions } from '@/constants/navigation';
import { useTheme } from '@/constants/theme';

export default function OnboardingLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ ...stackScreenOptions(theme), headerTitle: '', headerBackTitle: t('common.back') }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="waitlist" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
