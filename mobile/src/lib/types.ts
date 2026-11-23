// Formatos devolvidos pelas RPCs do schema dailycards (ver backend/README.md).

export type CardType = 'term' | 'tip' | 'question' | 'trend';
export type CardLayer = 'technical' | 'career';
export type AreaLayer = 'full' | 'career';
export type Relationship = 'works' | 'studies' | 'curious';
export type ReportCategory = 'incorrect' | 'outdated' | 'incomplete' | 'confusing' | 'context';

export const REPORT_CATEGORIES: ReportCategory[] = [
  'incorrect',
  'outdated',
  'incomplete',
  'confusing',
  'context',
];

export type Question = {
  options: string[];
  answer: number;
};

export type Card = {
  /** Dia da trilha (YYYY-MM-DD). Nulo na amostra e nos favoritos. */
  day: string | null;
  card_id: string;
  area_id: string;
  version: number;
  type: CardType;
  layer: CardLayer;
  widget_text: string;
  /** Nulo quando `locked` (explicação da pergunta no plano grátis). */
  body: string | null;
  locked: boolean;
  question: Question | null;
  source_url: string;
  source_label: string;
  fact_date: string | null;
  community_updated: boolean;
  my_rating: number | null;
  favorited: boolean;
};

export type Area = {
  id: string;
  slug: string;
  name_key: string;
  group_key: string;
  sort: number;
  /** Camada no país do aparelho; nulo se a profissão não estiver disponível nele. */
  layer: AreaLayer | null;
};

export type FollowedArea = {
  area_id: string;
  started_on: string;
  created_at: string;
};

export type Subscription = {
  entitlement: string;
  active: boolean;
  expires_at: string | null;
  period_type: string | null;
  will_renew: boolean | null;
};
