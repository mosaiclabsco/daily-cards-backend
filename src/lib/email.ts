// Envio via API HTTP do Resend (mesmo provedor do Lessonara).
export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("RESEND_API_KEY/EMAIL_FROM ausentes");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
}

export function reportAppliedEmail(payload: { decision?: string; widget_text?: string }) {
  const card = payload.widget_text ? `“${payload.widget_text}”` : "um card";
  const what = payload.decision === "remove" ? "foi retirado do app" : "foi corrigido";
  return {
    subject: "Sua sugestão foi aplicada",
    text: `Obrigado pela sugestão! Depois da revisão, ${card} ${what}.\n\nCada correção deixa o conteúdo melhor para todo mundo da sua área.`,
  };
}
