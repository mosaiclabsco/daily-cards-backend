import { useEffect, useState } from 'react';

import { useLoader } from '@/hooks/use-loader';
import { ApiError, getTrack, listFavorites } from '@/lib/api';
import { cardStore } from '@/lib/card-store';
import { addDays, localToday } from '@/lib/dates';
import { trackStore } from '@/lib/storage';
import type { Card } from '@/lib/types';

/** Re-renderiza quando qualquer card do cardStore muda (nota e favorito em todas as telas). */
export function useCardStoreVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => cardStore.subscribe(() => setVersion((n) => n + 1)), []);
  return version;
}

function useFreshCards(cards: Card[]) {
  useCardStoreVersion();
  return cards.map((c) => cardStore.get(c.card_id) ?? c);
}

type TrackResult = { cards: Card[]; offline: boolean };

// Trilha da profissão: de hoje-2 até hoje+14, que é o que o banco libera no grátis e o que o
// widget vai usar. Sem rede, usa o último cache salvo no aparelho.
async function fetchTrack(areaId: string): Promise<TrackResult> {
  const today = localToday();
  try {
    const cards = await getTrack(areaId, addDays(today, -2), addDays(today, 14));
    cardStore.put(cards);
    void trackStore.set(areaId, cards);
    return { cards, offline: false };
  } catch (e) {
    const cache = await trackStore.get(areaId);
    if (cache && e instanceof ApiError && e.code === 'network') {
      cardStore.put(cache.cards);
      return { cards: cache.cards, offline: true };
    }
    throw e;
  }
}

export function useTrack(areaId: string | null) {
  const { data, loading, error, reload } = useLoader(
    areaId ? () => fetchTrack(areaId) : null,
    areaId,
    { cards: [], offline: false },
  );
  return { cards: useFreshCards(data.cards), offline: data.offline, loading, error, reload };
}

/** Janela de busca do histórico: o banco aceita no máximo 31 dias por chamada. */
export const PAST_WINDOW = 30;

/**
 * Dias anteriores da trilha, do mais recente para o mais antigo, cobrindo os últimos `days` dias
 * em janelas de 30. O grátis recebe só 3 dias, então `hasMore` fica falso logo de cara.
 */
export function usePastCards(areaId: string | null, days = PAST_WINDOW) {
  const { data, loading, error, reload } = useLoader(
    areaId
      ? async () => {
          const today = localToday();
          const all: Card[] = [];
          let lastWindow = 0;
          for (let end = 1; end <= days; end += PAST_WINDOW) {
            const list = await getTrack(areaId, addDays(today, -(end + PAST_WINDOW - 1)), addDays(today, -end));
            lastWindow = list.length;
            all.push(...list.slice().reverse());
          }
          cardStore.put(all);
          return { cards: all, hasMore: lastWindow > 0 };
        }
      : null,
    areaId ? `${areaId}:${days}` : null,
    { cards: [] as Card[], hasMore: false },
  );
  return { cards: useFreshCards(data.cards), hasMore: data.hasMore, loading, error, reload };
}

export function useFavorites() {
  const { data, loading, error, reload } = useLoader(
    async () => {
      const list = await listFavorites();
      cardStore.put(list);
      return list;
    },
    'favorites',
    [] as Card[],
  );
  const cards = useFreshCards(data).filter((c) => c.favorited);
  return { cards, loading, error, reload };
}
