import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ProfessionList } from '@/components/area-pickers';
import { areaIcon, Icon } from '@/components/icon';
import { AppText, Button, Screen, Steps } from '@/components/ui';
import { Spacing, useTheme } from '@/constants/theme';
import { onboardingStore } from '@/lib/storage';

// Passo 2 de 3: a profissão dentro da área escolhida.
export default function ChooseProfession() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { group } = useLocalSearchParams<{ group: string }>();

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          title={t('onboarding.profession.missing')}
          variant="ghost"
          onPress={() => router.push('/waitlist')}
        />
      }>
      <Steps total={3} current={2} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Icon name={areaIcon(group ?? '')} size={18} color={theme.primary} />
        <AppText variant="label" style={{ color: theme.primary }}>
          {t(`group.${group}`)}
        </AppText>
      </View>
      <AppText variant="title">{t('onboarding.profession.title')}</AppText>
      <ProfessionList
        groupKey={group}
        onSelect={(area) => {
          void onboardingStore
            .set({ areaId: area.id, areaSlug: area.slug, relationship: null })
            .then(() => router.push('/relationship'));
        }}
      />
    </Screen>
  );
}
