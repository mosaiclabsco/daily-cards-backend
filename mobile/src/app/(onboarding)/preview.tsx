import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CardView } from '@/components/card-view';
import { AppText, Button, Loading, Notice, Screen } from '@/components/ui';
import { useAreas } from '@/hooks/use-areas';
import { ApiError, getSample } from '@/lib/api';
import { onboardingStore, type OnboardingChoice } from '@/lib/storage';
import type { Card } from '@/lib/types';
import { useSession } from '@/providers/session';

// Prévia do primeiro conhecimento da profissão, antes de pedir a conta.
// A conta vem depois de mostrar o valor: pedir cadastro antes costuma derrubar quem só está conhecendo.
export default function Preview() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session, refresh } = useSession();
  const { areas } = useAreas();
  const [choice, setChoice] = useState<OnboardingChoice | null>(null);
  const [card, setCard] = useState<Card | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const saved = await onboardingStore.get();
      if (!saved) {
        router.replace('/area');
        return;
      }
      if (active) setChoice(saved);
      try {
        const sample = await getSample(saved.areaSlug);
        if (active) setCard(sample);
      } catch (e) {
        if (active) {
          setCard(null);
          setError(t(`errors.${e instanceof ApiError ? e.code : 'unknown'}`));
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [router, t]);

  async function start() {
    if (!session) {
      router.push('/sign-up');
      return;
    }
    // Já logado (conta sem profissão): o SessionProvider segue a profissão guardada.
    setStarting(true);
    await refresh();
    setStarting(false);
  }

  if (card === undefined) return <Loading />;
  const area = areas?.find((a) => a.id === choice?.areaId);

  return (
    <Screen
      edges={['bottom']}
      footer={
        <>
          <Button
            title={session ? t('onboarding.preview.start') : t('onboarding.preview.createAccount')}
            loading={starting}
            onPress={() => void start()}
          />
          {session ? null : (
            <Button title={t('onboarding.haveAccount')} variant="ghost" onPress={() => router.push('/sign-in')} />
          )}
        </>
      }>
      {area ? (
        <AppText variant="label" muted>
          {t(area.name_key)}
        </AppText>
      ) : null}
      <AppText variant="title">{t('onboarding.preview.title')}</AppText>
      {error ? <Notice tone="error" text={error} /> : null}
      {card ? <CardView card={card} /> : <Notice text={t('onboarding.preview.empty')} />}
    </Screen>
  );
}
