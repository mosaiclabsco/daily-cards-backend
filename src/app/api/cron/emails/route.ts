import { validCronAuthorization } from "@/lib/cron-auth";
import { reportAppliedEmail, sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!validCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET))
    return new Response("unauthorized", { status: 401 });
  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from("email_outbox")
    .select("id, user_id, template, payload, attempts")
    .eq("status", "pending")
    .lt("attempts", 5)
    .order("created_at")
    .limit(100);
  if (error) return new Response("db error", { status: 500 });
  let sent = 0;
  for (const mail of pending ?? []) {
    try {
      const { data } = await admin.auth.admin.getUserById(mail.user_id);
      const to = data?.user?.email;
      if (!to) throw new Error("usuário sem e-mail");
      const { subject, text } = reportAppliedEmail(mail.payload);
      await sendEmail(to, subject, text);
      await admin.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", mail.id);
      sent++;
    } catch (e) {
      await admin
        .from("email_outbox")
        .update({
          attempts: mail.attempts + 1,
          status: mail.attempts + 1 >= 5 ? "failed" : "pending",
          last_error: (e instanceof Error ? e.message : String(e)).slice(0, 500),
        })
        .eq("id", mail.id);
    }
  }
  return Response.json({ sent, pending: (pending?.length ?? 0) - sent });
}
