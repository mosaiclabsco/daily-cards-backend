import { validCronAuthorization } from "@/lib/cron-auth";
import { fetchSubscriber, parseWebhook, subscriptionRow } from "@/lib/revenuecat";
import { createAdminClient } from "@/lib/supabase/server";

// Configure no RevenueCat o header Authorization = "Bearer <REVENUECAT_WEBHOOK_SECRET>".
export async function POST(request: Request) {
  if (!validCronAuthorization(request.headers.get("authorization"), process.env.REVENUECAT_WEBHOOK_SECRET))
    return new Response("unauthorized", { status: 401 });

  const body = await request.json().catch(() => null);
  const event = parseWebhook(body);
  if (!event) return new Response("invalid payload", { status: 400 });

  const admin = createAdminClient();
  const { data: fresh, error } = await admin
    .from("revenuecat_events")
    .upsert(
      { id: event.id, type: event.type, app_user_id: event.appUserId, payload: body },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return new Response("db error", { status: 500 });
  if (!fresh?.length) return Response.json({ duplicate: true });

  try {
    for (const userId of event.userIds) {
      const { data: user } = await admin.auth.admin.getUserById(userId);
      if (!user?.user) continue;
      const row = subscriptionRow(userId, await fetchSubscriber(userId));
      const { error: upsertError } = await admin
        .from("subscriptions")
        .upsert(row, { onConflict: "user_id,entitlement" });
      if (upsertError) throw upsertError;
    }
  } catch {
    // Libera o evento para o retry do RevenueCat reprocessar.
    await admin.from("revenuecat_events").delete().eq("id", event.id);
    return new Response("sync failed", { status: 500 });
  }
  return Response.json({ ok: true, users: event.userIds.length });
}
