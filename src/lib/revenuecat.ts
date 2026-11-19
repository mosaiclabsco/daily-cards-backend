// Integração RevenueCat. O app chama Purchases.logIn(<id do usuário no Supabase>), então
// app_user_id é o UUID do auth.users. O webhook só avisa que algo mudou; o estado vem da API REST,
// o que dispensa tratar ordem de eventos e transferências na mão.

export const PREMIUM_ENTITLEMENT = "premium";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type WebhookEvent = {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
};

export function parseWebhook(body: unknown) {
  const event = (body as { event?: WebhookEvent } | null)?.event;
  if (!event?.id || !event.type) return null;
  const ids = [
    event.app_user_id,
    event.original_app_user_id,
    ...(event.aliases ?? []),
    ...(event.transferred_from ?? []),
    ...(event.transferred_to ?? []),
  ].filter((id): id is string => typeof id === "string" && UUID.test(id));
  return { id: event.id, type: event.type, appUserId: event.app_user_id ?? null, userIds: [...new Set(ids)] };
}

type Subscriber = {
  subscriber?: {
    entitlements?: Record<string, { expires_date: string | null; product_identifier: string }>;
    subscriptions?: Record<
      string,
      { store?: string; period_type?: string; unsubscribe_detected_at?: string | null }
    >;
  };
};

export function subscriptionRow(userId: string, json: Subscriber, now = new Date()) {
  const ent = json.subscriber?.entitlements?.[PREMIUM_ENTITLEMENT];
  const sub = ent ? json.subscriber?.subscriptions?.[ent.product_identifier] : undefined;
  const expires = ent?.expires_date ? new Date(ent.expires_date) : null;
  return {
    user_id: userId,
    entitlement: PREMIUM_ENTITLEMENT,
    active: Boolean(ent) && (expires === null || expires.getTime() > now.getTime()),
    expires_at: ent ? (expires?.toISOString() ?? null) : now.toISOString(),
    period_type: sub?.period_type ?? null,
    store: sub?.store ?? null,
    product_id: ent?.product_identifier ?? null,
    will_renew: sub ? !sub.unsubscribe_detected_at : null,
    synced_at: now.toISOString(),
  };
}

export async function fetchSubscriber(appUserId: string): Promise<Subscriber> {
  const key = process.env.REVENUECAT_SECRET_API_KEY;
  if (!key) throw new Error("REVENUECAT_SECRET_API_KEY ausente");
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`RevenueCat HTTP ${res.status}`);
  return res.json();
}
