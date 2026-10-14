const CHANNEL =
  /\b(e-?mails?|correo|whatsapp|whats\s*app|sms)\b|\btext\s+(her|him|them|the|laura)\b|\b(env[ií]a|env[ií]ar)\b.{0,40}\b(correo|whatsapp|email|e-mail)\b|\b(message|notify)\s+the\s+(client|guest|customer)\b/i;

export function asksForChannel(text: string): boolean {
  return CHANNEL.test(text);
}

export const CHANNEL_REPLY =
  "Email and WhatsApp are not tools on this desk. Those stay on the n8n bus after a confirmed write, and only that workflow sends them.";
