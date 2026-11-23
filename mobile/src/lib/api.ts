import { deviceCountry, deviceLocale, deviceTimezone } from '@/lib/device';
import { supabase } from '@/lib/supabase';
import type {
  Area,
  AreaLayer,
  Card,
  FollowedArea,
  Relationship,
  ReportCategory,
  Subscription,
} from '@/lib/types';

// Camada fina sobre o contrato do backend (backend/README.md). Plano, usuário e "hoje"
// são sempre decididos no banco; aqui só passamos o que o usuário escolheu.

/** Códigos de erro que as RPCs levantam (raise exception '<code>'). */
export type ApiErrorCode =
  | 'premium_required'
  | 'area_not_followed'
  | 'area_not_found'
  | 'card_not_found'
  | 'rate_limited'
  | 'invalid_source'
  | 'not_authenticated'
  | 'network'
  | 'unknown';

const KNOWN: ApiErrorCode[] = [
  'premium_required',
  'area_not_followed',
  'area_not_found',
  'card_not_found',
  'rate_limited',
  'invalid_source',
  'not_authenticated',
];

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

function toApiError(error: { message?: string } | null | undefined): ApiError {
  const message = error?.message ?? '';
  const code = KNOWN.find((c) => message.includes(c));
  if (code) return new ApiError(code, message);
  if (/network|fetch|timeout/i.test(message)) return new ApiError('network', message);
  return new ApiError('unknown', message);
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw toApiError(error);
  return data as T;
}

// --- Catálogo (anon) ------------------------------------------------------

export async function listAreas(country = deviceCountry()): Promise<Area[]> {
  const [areas, countries] = await Promise.all([
    supabase.from('areas').select('id, slug, name_key, group_key, sort').order('sort'),
    supabase.from('area_countries').select('area_id, layer').eq('country', country),
  ]);
  if (areas.error) throw toApiError(areas.error);
  if (countries.error) throw toApiError(countries.error);
  const layers = new Map(
    (countries.data as { area_id: string; layer: AreaLayer }[]).map((c) => [c.area_id, c.layer]),
  );
  return (areas.data as Omit<Area, 'layer'>[]).map((a) => ({ ...a, layer: layers.get(a.id) ?? null }));
}

export function getSample(areaSlug: string) {
  return rpc<Card | null>('get_sample', {
    p_area_slug: areaSlug,
    p_locale: deviceLocale(),
    p_country: deviceCountry(),
  });
}

export function joinWaitlist(email: string, profession: string) {
  return rpc<void>('join_waitlist', {
    p_email: email,
    p_profession: profession,
    p_locale: deviceLocale(),
  });
}

// --- Perfil e profissões ----------------------------------------------------

/** Atualiza idioma, país e fuso do aparelho; relação com a área só quando informada. */
export function saveProfile(relationship: Relationship | null) {
  return rpc<void>('save_profile', {
    p_relationship: relationship,
    p_locale: deviceLocale(),
    p_country: deviceCountry(),
    p_timezone: deviceTimezone(),
  });
}

export async function listFollowedAreas(): Promise<FollowedArea[]> {
  const { data, error } = await supabase
    .from('user_areas')
    .select('area_id, started_on, created_at')
    .order('created_at')
    .order('area_id');
  if (error) throw toApiError(error);
  return data as FollowedArea[];
}

export function followArea(areaId: string) {
  return rpc<void>('follow_area', { p_area: areaId });
}

export function unfollowArea(areaId: string) {
  return rpc<void>('unfollow_area', { p_area: areaId });
}

// --- Cards ------------------------------------------------------------------

export async function getTrack(areaId: string, from: string, to: string) {
  const cards = await rpc<Card[] | null>('get_track', { p_area: areaId, p_from: from, p_to: to });
  return cards ?? [];
}

export function rateCard(cardId: string, score: number) {
  return rpc<void>('rate_card', { p_card: cardId, p_score: score });
}

export function reportCard(cardId: string, category: ReportCategory, text: string, source: string) {
  return rpc<string>('report_card', {
    p_card: cardId,
    p_category: category,
    p_text: text,
    p_source: source,
  });
}

export function toggleFavorite(cardId: string) {
  return rpc<boolean>('toggle_favorite', { p_card: cardId });
}

export async function listFavorites() {
  const cards = await rpc<Card[] | null>('list_favorites');
  return cards ?? [];
}

// --- Assinatura e conta -----------------------------------------------------

export async function getSubscription(): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('entitlement, active, expires_at, period_type, will_renew')
    .eq('entitlement', 'premium')
    .maybeSingle();
  if (error) throw toApiError(error);
  return data as Subscription | null;
}

export function isPremiumActive(sub: Subscription | null) {
  if (!sub?.active) return false;
  return !sub.expires_at || new Date(sub.expires_at).getTime() > Date.now();
}

/** Exclui a conta pelo backend (Next.js), que confere a identidade pelo token. */
export async function deleteAccount() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) throw new ApiError('unknown', 'EXPO_PUBLIC_API_URL não definido');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('not_authenticated');
  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/account/delete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e) {
    throw new ApiError('network', String(e));
  }
  if (response.status === 401) throw new ApiError('not_authenticated');
  if (!response.ok) throw new ApiError('unknown', `HTTP ${response.status}`);
}
