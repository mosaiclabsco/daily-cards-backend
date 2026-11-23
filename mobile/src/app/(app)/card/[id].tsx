import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { CardActions } from '@/components/card-actions';
import { CardView } from '@/components/card-view';
import { Notice, Screen } from '@/components/ui';
import { useCardStoreVersion } from '@/hooks/use-track';
import { cardStore } from '@/lib/card-store';
import { formatShortDate } from '@/lib/dates';

// Card aberto a partir do Arquivo. Usa o card já carregado nas listas.
export default function CardScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  useCardStoreVersion();
  const card = id ? cardStore.get(id) : undefined;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: card?.day ? formatShortDate(card.day, i18n.language) : '' }} />
      {card ? (
        <>
          <CardView card={card} />
          <CardActions card={card} />
        </>
      ) : (
        <Notice text={t('errors.card_not_found')} />
      )}
    </Screen>
  );
}
