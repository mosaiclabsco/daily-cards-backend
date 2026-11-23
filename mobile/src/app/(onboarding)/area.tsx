import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AreaGrid } from '@/components/area-pickers';
import { AppText, Screen, Steps } from '@/components/ui';

// Passo 1 de 3: a área (Saúde, Tecnologia…). A profissão vem na tela seguinte.
export default function ChooseArea() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Screen edges={['bottom']}>
      <Steps total={3} current={1} />
      <AppText variant="title">{t('onboarding.area.title')}</AppText>
      <AreaGrid
        onSelect={(group) => router.push({ pathname: '/profession', params: { group } })}
      />
    </Screen>
  );
}
