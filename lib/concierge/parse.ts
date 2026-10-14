import type { ToolCall } from "@/lib/concierge/schema";

const WEEKDAYS: Record<string, string> = {
  sunday: "sunday",
  domingo: "sunday",
  monday: "monday",
  lunes: "monday",
  tuesday: "tuesday",
  martes: "tuesday",
  wednesday: "wednesday",
  miercoles: "wednesday",
  miércoles: "wednesday",
  thursday: "thursday",
  jueves: "thursday",
  friday: "friday",
  viernes: "friday",
  saturday: "saturday",
  sabado: "saturday",
  sábado: "saturday",
};

function weekday(text: string): string | undefined {
  const match = text.match(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado)\b/i
  );
  if (!match) return undefined;
  const key = match[1]!.toLowerCase();
  return WEEKDAYS[key];
}

function service(text: string): string | undefined {
  if (/antiedad|anti-?aging/i.test(text)) return "facial antiedad";
  if (/limpieza|deep clean/i.test(text)) return "limpieza facial";
  if (/facial/i.test(text)) return "facial";
  if (/masaj|massage/i.test(text)) return "massage";
  if (/manicur|nails|uñas|unas/i.test(text)) return "nails";
  if (/cej|brow|eyebrow/i.test(text)) return "brows";
  return undefined;
}

function clock(text: string): string | undefined {
  const at = text.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
  if (at) return at[1];
  const after = text.match(/\bafter\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i);
  if (after) return after[1];
  const despues = text.match(/despu[eé]s de (?:las\s+)?(\d{1,2})\b/i);
  if (despues) return despues[1];
  return undefined;
}

const HELP =
  "I can search openings, or prepare a booking, reschedule, or cancellation. A card has to be confirmed before anything is written.";

export function parseUtterance(text: string): ToolCall {
  const serviceName = service(text);
  const day = weekday(text);
  const after = clock(text);
  if (/\b(cancel|cancela)\b/i.test(text)) {
    return { tool: "cancel_appointment", ...(serviceName ? { service: serviceName } : {}) };
  }
  if (/\b(reschedule|reprogram|move)\b/i.test(text)) {
    return {
      tool: "reschedule_appointment",
      ...(serviceName ? { service: serviceName } : {}),
      ...(day ? { weekday: day } : {}),
      ...(after ? { after } : {}),
    };
  }
  if (/\b(book|reserve|schedule|agenda|reserv)\b/i.test(text)) {
    if (!serviceName) return { tool: "reply", text: "Which service should I put on the card?" };
    return {
      tool: "create_appointment",
      service: serviceName,
      ...(day ? { weekday: day } : {}),
      ...(after ? { after } : {}),
    };
  }
  if (/\b(opening|openings|available|availability|free|search)\b/i.test(text) || /\bany\b/i.test(text)) {
    if (!serviceName) return { tool: "reply", text: "Which service should I search?" };
    return {
      tool: "search_slots",
      service: serviceName,
      ...(day ? { weekday: day } : {}),
      ...(after ? { after } : {}),
    };
  }
  return { tool: "reply", text: HELP };
}
