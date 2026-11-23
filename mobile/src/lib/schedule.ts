import { parseIsoDate } from '@/lib/dates';
import type { CardType } from '@/lib/types';

// Espelho da agenda semanal do banco (dailycards_private.slot_type), só para textos da interface.
// Quem decide o card de cada dia é sempre o banco.
const BY_WEEKDAY: CardType[] = ['question', 'term', 'tip', 'question', 'term', 'trend', 'tip'];

export function slotType(isoDate: string): CardType {
  return BY_WEEKDAY[parseIsoDate(isoDate).getDay()];
}
