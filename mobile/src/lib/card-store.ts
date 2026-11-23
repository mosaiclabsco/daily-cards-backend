import type { Card } from '@/lib/types';

// Cards já carregados (trilha, arquivo, favoritos), para a tela do card abrir sem nova chamada
// e para refletir nota e favorito em todas as listas.

const cards = new Map<string, Card>();
const listeners = new Set<() => void>();

export const cardStore = {
  get: (cardId: string) => cards.get(cardId),
  put(list: Card[]) {
    for (const card of list) {
      const prev = cards.get(card.card_id);
      // Mantém o dia da trilha quando o mesmo card chega sem dia (favoritos).
      cards.set(card.card_id, { ...card, day: card.day ?? prev?.day ?? null });
    }
    listeners.forEach((l) => l());
  },
  patch(cardId: string, change: Partial<Card>) {
    const prev = cards.get(cardId);
    if (!prev) return;
    cards.set(cardId, { ...prev, ...change });
    listeners.forEach((l) => l());
  },
  clear() {
    cards.clear();
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
