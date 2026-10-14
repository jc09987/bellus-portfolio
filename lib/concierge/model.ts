import { SERVICES } from "@/lib/demo/salon";
import { acceptTool, TOOL_SCHEMA_TEXT, type ToolCall } from "@/lib/concierge/schema";

export type ModelOutcome = "accepted" | "rejected_shape" | "skipped" | "error";

export type ModelTrace = {
  outcome: ModelOutcome;
  model: string | null;
  latencyMs: number | null;
  costUsd: number | null;
  tool: ToolCall | null;
  detail: string;
};

const DEFAULT_MODEL = "gpt-4o-mini";

const USD_PER_TOKEN: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  "gpt-4.1-mini": { input: 0.4 / 1_000_000, output: 1.6 / 1_000_000 },
  "gpt-4.1-nano": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
};

function modelName() {
  return process.env.BELLUS_CONCIERGE_MODEL?.trim() || DEFAULT_MODEL;
}

function costFor(model: string, prompt: number | null, completion: number | null) {
  const rate = USD_PER_TOKEN[model];
  if (!rate || prompt == null || completion == null) return null;
  return Math.round((prompt * rate.input + completion * rate.output) * 1_000_000) / 1_000_000;
}

function catalog() {
  return SERVICES.map((service) => `${service.name} (${service.durationMinutes} min)`).join(", ");
}

export async function interpretWithModel(text: string): Promise<ModelTrace> {
  const key = process.env.OPENAI_API_KEY?.trim();
  const model = modelName();
  if (!key) {
    return { outcome: "skipped", model: null, latencyMs: null, costUsd: null, tool: null, detail: "No API key." };
  }
  const started = Date.now();
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 180,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You map one staff message to one JSON object.",
              "Return only one of these shapes. No other keys:",
              TOOL_SCHEMA_TEXT,
              "weekday is an English day name. after is 24-hour HH:MM. 5pm is 17:00.",
              "A booking, move, or cancellation is only a proposal. Do not say it is already saved.",
              "You cannot email, WhatsApp, SMS, or notify a customer. If the message asks for that, return {\"tool\":\"reply\",\"text\":\"Email and WhatsApp are not tools on this desk.\"}.",
              "If the message is not one of the four desk tools, return {\"tool\":\"reply\",\"text\":\"I can search, book, reschedule, or cancel.\"}.",
              `Menu: ${catalog()}. A facial with no other qualifier is Facial hidratante.`,
            ].join("\n"),
          },
          { role: "user", content: text },
        ],
      }),
    });
    const latencyMs = Date.now() - started;
    const body = (await response.json()) as {
      error?: { message?: string };
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!response.ok) {
      return {
        outcome: "error",
        model,
        latencyMs,
        costUsd: null,
        tool: null,
        detail: body.error?.message?.slice(0, 180) || "The model request failed.",
      };
    }
    const content = body.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { outcome: "rejected_shape", model, latencyMs, costUsd: null, tool: null, detail: "The model did not return JSON." };
    }
    const accepted = acceptTool(parsed);
    const costUsd = costFor(model, body.usage?.prompt_tokens ?? null, body.usage?.completion_tokens ?? null);
    if (!accepted.ok) {
      return { outcome: "rejected_shape", model, latencyMs, costUsd, tool: null, detail: accepted.reason };
    }
    return { outcome: "accepted", model, latencyMs, costUsd, tool: accepted.tool, detail: accepted.tool.tool };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The model request failed.";
    return { outcome: "error", model, latencyMs: Date.now() - started, costUsd: null, tool: null, detail: message.slice(0, 180) };
  }
}
