import { expect, it } from "vitest";
import { parseWebhook, subscriptionRow } from "./revenuecat";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const now = new Date("2026-11-18T12:00:00Z");

it("extrai ids válidos do evento, inclusive transferência, e ignora anônimos", () => {
  const parsed = parseWebhook({
    event: { id: "e1", type: "TRANSFER", app_user_id: "$RCAnonymousID:abc", transferred_from: [U1], transferred_to: [U2] },
  });
  expect(parsed).toMatchObject({ id: "e1", type: "TRANSFER", userIds: [U1, U2] });
  expect(parseWebhook({})).toBeNull();
});

it("premium ativo com expiração futura", () => {
  const row = subscriptionRow(
    U1,
    {
      subscriber: {
        entitlements: { premium: { expires_date: "2026-12-18T12:00:00Z", product_identifier: "annual" } },
        subscriptions: { annual: { store: "play_store", period_type: "trial", unsubscribe_detected_at: null } },
      },
    },
    now,
  );
  expect(row).toMatchObject({ active: true, period_type: "trial", store: "play_store", will_renew: true });
});

it("cancelado continua ativo até expirar; expirado fica inativo", () => {
  const sub = (expires: string) => ({
    subscriber: {
      entitlements: { premium: { expires_date: expires, product_identifier: "m" } },
      subscriptions: { m: { unsubscribe_detected_at: "2026-11-01T00:00:00Z" } },
    },
  });
  expect(subscriptionRow(U1, sub("2026-11-30T00:00:00Z"), now)).toMatchObject({ active: true, will_renew: false });
  expect(subscriptionRow(U1, sub("2026-11-17T00:00:00Z"), now).active).toBe(false);
});

it("sem entitlement fica inativo", () => {
  expect(subscriptionRow(U1, { subscriber: { entitlements: {} } }, now).active).toBe(false);
});
