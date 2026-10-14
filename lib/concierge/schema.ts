export type ToolName =
  | "search_slots"
  | "create_appointment"
  | "reschedule_appointment"
  | "cancel_appointment"
  | "reply";

export type ToolCall = {
  tool: ToolName;
  service?: string;
  weekday?: string;
  after?: string;
  start?: string;
  text?: string;
};

const SHAPES: Record<ToolName, readonly string[]> = {
  search_slots: ["tool", "service", "weekday", "after"],
  create_appointment: ["tool", "service", "weekday", "after", "start"],
  reschedule_appointment: ["tool", "service", "weekday", "after", "start"],
  cancel_appointment: ["tool", "service"],
  reply: ["tool", "text"],
};

const BANNED = new Set([
  "send_email",
  "send_whatsapp",
  "whatsapp",
  "email",
  "sms",
  "notify",
  "message_client",
  "send_message",
]);

export const TOOL_SCHEMA_TEXT = [
  '{"tool":"search_slots","service":"facial","weekday":"thursday","after":"17:00"}',
  '{"tool":"create_appointment","service":"facial","weekday":"thursday","after":"17:00"}',
  '{"tool":"reschedule_appointment","service":"facial","weekday":"friday","after":"11:00"}',
  '{"tool":"cancel_appointment","service":"facial"}',
  '{"tool":"reply","text":"short answer"}',
].join("\n");

export function acceptTool(value: unknown): { ok: true; tool: ToolCall } | { ok: false; reason: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "The model did not return an object." };
  }
  const record = value as Record<string, unknown>;
  const tool = record.tool;
  if (typeof tool !== "string") return { ok: false, reason: "Missing tool." };
  if (BANNED.has(tool)) return { ok: false, reason: "Email and WhatsApp are not tools." };
  if (!(tool in SHAPES)) return { ok: false, reason: "Unknown tool." };
  const allowed = SHAPES[tool as ToolName];
  const extra = Object.keys(record).filter((key) => !allowed.includes(key));
  if (extra.length > 0) return { ok: false, reason: `Unexpected keys: ${extra.join(", ")}.` };
  for (const [key, field] of Object.entries(record)) {
    if (key === "tool") continue;
    if (typeof field !== "string" || field.trim() === "") {
      return { ok: false, reason: `${key} must be text.` };
    }
  }
  return { ok: true, tool: record as ToolCall };
}
