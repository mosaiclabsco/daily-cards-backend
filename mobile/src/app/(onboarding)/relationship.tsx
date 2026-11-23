import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, OptionRow, Screen, Steps } from '@/components/ui';
import { onboardingStore } from '@/lib/storage';
import type { Relationship } from '@/lib/types';

const OPTIONS: Relationship[] = ['works', 'studies', 'curious'];

// Passo 3 de 3: relação com a área (métricas e oferta; o conteúdo é o mesmo para todos).
export default function ChooseRelationship() {
  const router = useRouter();
  const { t } = useTranslation();

  async function choose(relationship: Relationship) {
    const choice = await onboardingStore.get();
    if (!choice) {
      router.replace('/area');
      return;
    }
    await onboardingStore.set({ ...choice, relationship });
    router.push('/preview');
  }

  return (
    <Screen edges={['bottom']}>
      <Steps total={3} current={3} />
      <AppText variant="title">{t('onboarding.relationship.title')}</AppText>
      {OPTIONS.map((option) => (
        <OptionRow
          key={option}
          icon={option}
          title={t(`onboarding.relationship.${option}`)}
          subtitle={t(`onboarding.relationship.${option}Hint`)}
          onPress={() => void choose(option)}
        />
      ))}
    </Screen>
  );
}
