import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const AI_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

// Uma chamada com saída JSON validada por schema. Recusas caem no fallback server-side.
export async function generateJson<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  prompt: string;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: AI_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
  });
  if (response.stop_reason === "refusal") throw new Error("Modelo recusou o pedido");
  if (response.stop_reason === "max_tokens") throw new Error("Resposta cortada em max_tokens");
  if (!response.parsed_output) throw new Error("Resposta sem JSON válido");
  return response.parsed_output as z.infer<S>;
}
