import { serviceById, staffById } from "@/lib/demo/salon";
import { formatRange, formatSlot } from "@/lib/demo/time";
import type { DeskPending, DeskView, Session } from "@/lib/demo/types";

function pendingView(session: Session): DeskPending | null {
  const pending = session.pending;
  if (!pending) return null;
  if (pending.tool === "create_appointment") {
    const service = serviceById(pending.serviceId);
    const staff = staffById(pending.staffId);
    return {
      id: pending.id,
      tool: pending.tool,
      heading: `Book ${service?.name ?? "appointment"}`,
      detail: `${formatRange(pending.start, pending.end)} · ${staff?.name ?? "Staff"} · ${pending.clientName} · ${pending.clientEmail}`,
      startAt: pending.start,
      endAt: pending.end,
      appointmentId: null,
    };
  }
  if (pending.tool === "reschedule_appointment") {
    const service = serviceById(pending.serviceId);
    return {
      id: pending.id,
      tool: pending.tool,
      heading: `Move ${service?.name ?? "appointment"}`,
      detail: formatRange(pending.start, pending.end),
      startAt: pending.start,
      endAt: pending.end,
      appointmentId: pending.appointmentId,
    };
  }
  const service = serviceById(pending.serviceId);
  const current = session.appointments.find((appointment) => appointment.id === pending.appointmentId);
  return {
    id: pending.id,
    tool: pending.tool,
    heading: `Cancel ${service?.name ?? "appointment"}`,
    detail: current ? `${formatRange(current.startAt, current.endAt)} · ${current.clientName}` : "This appointment",
    startAt: null,
    endAt: null,
    appointmentId: pending.appointmentId,
  };
}

export function toDeskView(session: Session): DeskView {
  return {
    appointments: session.appointments
      .map((appointment) => ({
        id: appointment.id,
        serviceName: serviceById(appointment.serviceId)?.name ?? "Appointment",
        staffName: staffById(appointment.staffId)?.name ?? "Staff",
        clientName: appointment.clientName,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        source: appointment.source,
      }))
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    pending: pendingView(session),
    slotLabels: session.lastSlots.map((slot) => formatSlot(slot.start)),
    bus: session.bus,
    reminder: session.reminder,
    messages: session.messages,
    trace: session.trace,
  };
}
