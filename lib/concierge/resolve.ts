import { activeAppointment, searchSlots, staffForService } from "@/lib/demo/book";
import { serviceById, SERVICES, WALK_IN, type Service } from "@/lib/demo/salon";
import { formatMoney, formatRange, formatSlot, parseClock, weekdayIndex } from "@/lib/demo/time";
import type { Proposal, Session, Slot, Trace } from "@/lib/demo/types";
import { asksForChannel, CHANNEL_REPLY } from "@/lib/concierge/guard";
import { interpretWithModel } from "@/lib/concierge/model";
import { parseUtterance } from "@/lib/concierge/parse";
import type { ToolCall } from "@/lib/concierge/schema";

export type Turn = {
  trace: Trace;
  proposal: Proposal | null;
  slots: Slot[];
  reply: string;
};

function matchService(query: string | undefined): Service | null {
  if (!query) return null;
  const value = query.toLowerCase();
  if (value.includes("antiedad") || value.includes("anti-aging") || value.includes("anti aging")) {
    return SERVICES.find((service) => service.slug === "facial-antiedad") ?? null;
  }
  if (value.includes("limpieza") || value.includes("clean")) {
    return SERVICES.find((service) => service.slug === "limpieza-facial") ?? null;
  }
  if (value.includes("facial")) return SERVICES.find((service) => service.slug === "facial-hidratante") ?? null;
  if (value.includes("masaj") || value.includes("massage")) {
    return SERVICES.find((service) => service.category === "massage") ?? null;
  }
  if (value.includes("manic") || value.includes("nail") || value.includes("uña") || value.includes("una")) {
    return SERVICES.find((service) => service.category === "nails") ?? null;
  }
  if (value.includes("cej") || value.includes("brow")) {
    return SERVICES.find((service) => service.category === "brows") ?? null;
  }
  return (
    SERVICES.find((service) => service.name.toLowerCase() === value || service.slug === value) ?? null
  );
}

function replyTurn(trace: Trace, text: string): Turn {
  return { trace, proposal: null, slots: [], reply: text };
}

function openSlots(
  session: Session,
  service: Service,
  weekday: number,
  afterMinutes: number,
  excludeAppointmentId?: string
): Slot[] {
  const staff = staffForService(service.id);
  if (!staff) return [];
  return searchSlots(session, {
    serviceId: service.id,
    staffId: staff.id,
    weekday,
    afterMinutes,
    durationMinutes: service.durationMinutes,
    excludeAppointmentId,
  });
}

function chooseSlot(slots: Slot[], start: string | undefined): Slot | null {
  if (!start) return slots[0] ?? null;
  const time = new Date(start).getTime();
  if (Number.isNaN(time)) return null;
  return slots.find((slot) => new Date(slot.start).getTime() === time) ?? null;
}

export function turnFromTool(tool: ToolCall, session: Session, trace: Trace): Turn {
  if (tool.tool === "reply") {
    return replyTurn({ ...trace, outcome: "reply", tool: "reply" }, tool.text || "I can search, book, reschedule, or cancel.");
  }

  const service = matchService(tool.service);
  if (tool.tool === "cancel_appointment") {
    const appointment = activeAppointment(session, service?.id);
    if (!appointment) {
      return replyTurn(trace, "There is no open appointment to cancel.");
    }
    const booked = serviceById(appointment.serviceId);
    const proposal: Proposal = {
      id: crypto.randomUUID(),
      tool: "cancel_appointment",
      appointmentId: appointment.id,
      serviceId: appointment.serviceId,
    };
    return {
      trace: { ...trace, outcome: "proposal", tool: proposal.tool },
      proposal,
      slots: [],
      reply: `Cancel ${booked?.name ?? "the appointment"} on ${formatRange(appointment.startAt, appointment.endAt)}? Confirm the card. I will not message ${appointment.clientName}.`,
    };
  }

  if (!service) {
    return replyTurn(trace, "I could not match that to the seed menu.");
  }
  const staff = staffForService(service.id);
  if (!staff) return replyTurn(trace, "Nobody on the seed roster does that service.");

  const afterMinutes = tool.after ? parseClock(tool.after) : 0;
  if (tool.after && afterMinutes == null) {
    return replyTurn(trace, "I could not read that time.");
  }
  let weekday = tool.weekday ? weekdayIndex(tool.weekday) : null;
  if (tool.start && weekday == null) weekday = new Date(tool.start).getDay();
  if (weekday == null) {
    return replyTurn(trace, "Which day should I use?");
  }

  const exclude = tool.tool === "reschedule_appointment" ? activeAppointment(session, service.id)?.id : undefined;
  const slots = openSlots(session, service, weekday, afterMinutes ?? 0, exclude);
  if (tool.tool === "search_slots") {
    const labels = slots.map((slot) => formatSlot(slot.start));
    return {
      trace: { ...trace, outcome: "slots", tool: "search_slots" },
      proposal: null,
      slots,
      reply:
        labels.length > 0
          ? `Open for ${service.name} with ${staff.name}: ${labels.join(", ")}.`
          : `Nothing is open for ${service.name} then.`,
    };
  }

  const slot = chooseSlot(slots, tool.start);
  if (!slot) {
    return replyTurn({ ...trace, outcome: "reply", tool: null }, `Nothing is open for ${service.name} then.`);
  }

  if (tool.tool === "create_appointment") {
    const proposal: Proposal = {
      id: crypto.randomUUID(),
      tool: "create_appointment",
      serviceId: service.id,
      staffId: staff.id,
      start: slot.start,
      end: slot.end,
      ...WALK_IN,
    };
    return {
      trace: { ...trace, outcome: "proposal", tool: proposal.tool },
      proposal,
      slots,
      reply: `${service.name} with ${staff.name}, ${formatRange(slot.start, slot.end)}, ${formatMoney(service.price)}. Guest is ${WALK_IN.clientName}. Confirm the card to write it. I will not email or WhatsApp them.`,
    };
  }

  const current = activeAppointment(session, service.id);
  if (!current) return replyTurn(trace, `There is no open ${service.name} to move.`);
  const proposal: Proposal = {
    id: crypto.randomUUID(),
    tool: "reschedule_appointment",
    appointmentId: current.id,
    serviceId: service.id,
    staffId: current.staffId,
    start: slot.start,
    end: slot.end,
  };
  return {
    trace: { ...trace, outcome: "proposal", tool: proposal.tool },
    proposal,
    slots,
    reply: `Move ${service.name} to ${formatRange(slot.start, slot.end)}? Confirm the card. I will not message ${current.clientName}.`,
  };
}

export function resolveLocal(text: string, session: Session): Turn {
  if (asksForChannel(text)) {
    return replyTurn(
      {
        source: "guard",
        outcome: "rejected",
        tool: null,
        model: null,
        latencyMs: null,
        costUsd: null,
        detail: "The message asked for a customer channel. The model was not called.",
      },
      CHANNEL_REPLY
    );
  }
  const tool = parseUtterance(text);
  return turnFromTool(tool, session, {
    source: "parser",
    outcome: "reply",
    tool: tool.tool,
    model: null,
    latencyMs: null,
    costUsd: null,
    detail: "Parser.",
  });
}

export async function resolveTurn(text: string, session: Session): Promise<Turn> {
  const trimmed = text.trim();
  if (!trimmed) {
    return replyTurn(
      {
        source: "parser",
        outcome: "reply",
        tool: null,
        model: null,
        latencyMs: null,
        costUsd: null,
        detail: "Empty message.",
      },
      "Tell me what to put on the desk."
    );
  }
  if (asksForChannel(trimmed)) return resolveLocal(trimmed, session);

  const model = await interpretWithModel(trimmed);
  if (model.outcome === "rejected_shape") {
    return replyTurn(
      {
        source: "model",
        outcome: "rejected",
        tool: null,
        model: model.model,
        latencyMs: model.latencyMs,
        costUsd: model.costUsd,
        detail: model.detail,
      },
      "That shape is not a desk tool, so nothing was prepared."
    );
  }
  if (model.outcome === "accepted" && model.tool && model.tool.tool !== "reply") {
    return turnFromTool(model.tool, session, {
      source: "model",
      outcome: "proposal",
      tool: model.tool.tool,
      model: model.model,
      latencyMs: model.latencyMs,
      costUsd: model.costUsd,
      detail: model.detail,
    });
  }
  const local = resolveLocal(trimmed, session);
  if (model.outcome === "accepted" && model.tool?.tool === "reply" && local.trace.outcome === "reply") {
    return local.trace.source === "guard"
      ? local
      : {
          ...local,
          trace: {
            source: "model",
            outcome: "reply",
            tool: "reply",
            model: model.model,
            latencyMs: model.latencyMs,
            costUsd: model.costUsd,
            detail: model.tool.text ?? model.detail,
          },
          reply: model.tool.text || local.reply,
        };
  }
  if (model.outcome !== "skipped") {
    return {
      ...local,
      trace: {
        ...local.trace,
        model: model.model,
        latencyMs: model.latencyMs,
        costUsd: model.costUsd,
        detail: `Model ${model.outcome}. ${local.trace.detail}`,
      },
    };
  }
  return local;
}
