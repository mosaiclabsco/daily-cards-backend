import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { stackScreenOptions } from '@/constants/navigation';
import { useTheme } from '@/constants/theme';

export default function AuthLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  return <Stack screenOptions={{ ...stackScreenOptions(theme), headerTitle: '', headerBackTitle: t('common.back') }} />;
}
