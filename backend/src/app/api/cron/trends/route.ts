import { validCronAuthorization } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { draftTrends, ingestTrends } from "@/lib/trends";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!validCronAuthorization(request.headers.get("authorization"), process.env.CRON_SECRET))
    return new Response("unauthorized", { status: 401 });
  const admin = createAdminClient();
  const ingest = await ingestTrends(admin);
  const draft = await draftTrends(admin);
  return Response.json({ ingest, draft });
}
