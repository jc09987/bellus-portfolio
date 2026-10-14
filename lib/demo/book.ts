import { getSlotsForDay } from "@/lib/appointments/slots";
import { inWindow, windowForHoursAhead } from "@/lib/appointments/reminders";
import { serviceById, staffById, staffFor, WALK_IN } from "@/lib/demo/salon";
import { formatRange } from "@/lib/demo/time";
import type { Appointment, BusEvent, Proposal, ReminderRun, Session, Slot } from "@/lib/demo/types";
import { WORKFLOWS } from "@/lib/demo/types";

const ACTIVE = ["pending", "confirmed"] as const;

function at(day: Date, hour: number, minute: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
}

function thisWeekday(weekday: number, now: Date): Date {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sinceMonday = (midnight.getDay() + 6) % 7;
  const monday = new Date(midnight);
  monday.setDate(midnight.getDate() - sinceMonday);
  const fromMonday = weekday === 0 ? 6 : weekday - 1;
  const date = new Date(monday);
  date.setDate(monday.getDate() + fromMonday);
  return date;
}

function blocks(session: Session, staffId: string, excludeId?: string): Appointment[] {
  return session.appointments.filter(
    (appointment) =>
      appointment.staffId === staffId &&
      appointment.id !== excludeId &&
      (ACTIVE as readonly string[]).includes(appointment.status)
  );
}

function overlaps(start: Date, end: Date, appointment: Appointment): boolean {
  const aStart = new Date(appointment.startAt).getTime();
  const aEnd = new Date(appointment.endAt).getTime();
  return start.getTime() < aEnd && end.getTime() > aStart;
}

export function createSession(now = new Date()): Session {
  const thursday = thisWeekday(4, now);
  const friday = thisWeekday(5, now);
  const browsStart = at(thursday, 11, 0);
  const massageStart = at(friday, 12, 0);
  return {
    appointments: [
      {
        id: "seed-brows-thu",
        serviceId: "svc-diseno-cejas",
        staffId: "stf-ana",
        clientName: "María G.",
        clientEmail: "maria.g@example.com",
        clientPhone: "600000001",
        startAt: browsStart.toISOString(),
        endAt: new Date(browsStart.getTime() + 30 * 60 * 1000).toISOString(),
        status: "confirmed",
        reminder24hSentAt: null,
        reminder2hSentAt: null,
        source: "seed",
      },
      {
        id: "seed-massage-fri",
        serviceId: "svc-masaje-relajante",
        staffId: "stf-sofia",
        clientName: "Carmen R.",
        clientEmail: "carmen.r@example.com",
        clientPhone: "600000002",
        startAt: massageStart.toISOString(),
        endAt: new Date(massageStart.getTime() + 60 * 60 * 1000).toISOString(),
        status: "confirmed",
        reminder24hSentAt: null,
        reminder2hSentAt: null,
        source: "seed",
      },
    ],
    pending: null,
    lastSlots: [],
    bus: [],
    reminder: null,
    messages: [],
    trace: null,
  };
}

export function searchSlots(
  session: Session,
  query: {
    serviceId: string;
    staffId: string;
    weekday: number;
    afterMinutes: number;
    durationMinutes: number;
    excludeAppointmentId?: string;
    now?: Date;
  }
): Slot[] {
  const now = query.now ?? new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < 21; i += 1) {
    if (cursor.getDay() === query.weekday) {
      const open = getSlotsForDay(cursor, query.durationMinutes).filter((slot) => {
        const minutes = slot.start.getHours() * 60 + slot.start.getMinutes();
        if (minutes < query.afterMinutes) return false;
        if (slot.start.getTime() <= now.getTime()) return false;
        return !blocks(session, query.staffId, query.excludeAppointmentId).some((appointment) =>
          overlaps(slot.start, slot.end, appointment)
        );
      });
      if (open.length > 0) {
        return open.map((slot) => ({ start: slot.start.toISOString(), end: slot.end.toISOString() }));
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return [];
}

function pushBus(session: Session, event: BusEvent["event"], appointmentId: string, now: Date) {
  session.bus.push({
    id: crypto.randomUUID(),
    at: now.toISOString(),
    event,
    appointmentId,
    workflow: WORKFLOWS[event],
    delivered: false,
  });
  session.bus = session.bus.slice(-12);
}

function onGrid(start: Date, durationMinutes: number): boolean {
  return getSlotsForDay(start, durationMinutes).some((slot) => slot.start.getTime() === start.getTime());
}

export function createAppointment(
  session: Session,
  proposal: Extract<Proposal, { tool: "create_appointment" }>,
  now = new Date()
): { ok: true; appointment: Appointment } | { ok: false; error: string } {
  const service = serviceById(proposal.serviceId);
  const staff = staffById(proposal.staffId);
  if (!service || !staff) return { ok: false, error: "That service is not on the seed menu." };
  if (proposal.clientEmail !== WALK_IN.clientEmail) {
    return { ok: false, error: "Bookings use the seeded walk-in guest." };
  }
  const start = new Date(proposal.start);
  const end = new Date(proposal.end);
  if (Number.isNaN(start.getTime()) || start.getTime() <= now.getTime()) {
    return { ok: false, error: "That time has already passed." };
  }
  if (!onGrid(start, service.durationMinutes)) {
    return { ok: false, error: "That time is not on the studio grid." };
  }
  if (blocks(session, staff.id).some((appointment) => overlaps(start, end, appointment))) {
    return { ok: false, error: "That time is already taken." };
  }
  const appointment: Appointment = {
    id: `apt-${crypto.randomUUID()}`,
    serviceId: service.id,
    staffId: staff.id,
    clientName: WALK_IN.clientName,
    clientEmail: WALK_IN.clientEmail,
    clientPhone: WALK_IN.clientPhone,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    status: "pending",
    reminder24hSentAt: null,
    reminder2hSentAt: null,
    source: "concierge",
  };
  session.appointments.push(appointment);
  pushBus(session, "appointment_created", appointment.id, now);
  return { ok: true, appointment };
}

export function rescheduleAppointment(
  session: Session,
  proposal: Extract<Proposal, { tool: "reschedule_appointment" }>,
  now = new Date()
): { ok: true; appointment: Appointment } | { ok: false; error: string } {
  const current = session.appointments.find((appointment) => appointment.id === proposal.appointmentId);
  if (!current || !(ACTIVE as readonly string[]).includes(current.status)) {
    return { ok: false, error: "That appointment can no longer be moved." };
  }
  const service = serviceById(current.serviceId);
  if (!service) return { ok: false, error: "That service is not on the seed menu." };
  const start = new Date(proposal.start);
  const end = new Date(proposal.end);
  if (Number.isNaN(start.getTime()) || start.getTime() <= now.getTime()) {
    return { ok: false, error: "Pick a time that is still ahead." };
  }
  if (!onGrid(start, service.durationMinutes)) {
    return { ok: false, error: "That time is not on the studio grid." };
  }
  if (blocks(session, current.staffId, current.id).some((appointment) => overlaps(start, end, appointment))) {
    return { ok: false, error: "That time is already taken." };
  }
  current.startAt = start.toISOString();
  current.endAt = end.toISOString();
  current.reminder24hSentAt = null;
  current.reminder2hSentAt = null;
  pushBus(session, "appointment_rescheduled", current.id, now);
  return { ok: true, appointment: current };
}

export function cancelAppointment(
  session: Session,
  proposal: Extract<Proposal, { tool: "cancel_appointment" }>,
  now = new Date()
): { ok: true; appointment: Appointment } | { ok: false; error: string } {
  const current = session.appointments.find((appointment) => appointment.id === proposal.appointmentId);
  if (!current || !(ACTIVE as readonly string[]).includes(current.status)) {
    return { ok: false, error: "That appointment can no longer be cancelled." };
  }
  current.status = "cancelled";
  pushBus(session, "appointment_canceled", current.id, now);
  return { ok: true, appointment: current };
}

export function runAppointmentReminders(session: Session, opts: { dryRun: boolean; now?: Date }): ReminderRun {
  const now = opts.now ?? new Date();
  const window24h = windowForHoursAhead(now, 24);
  const window2h = windowForHoursAhead(now, 2);
  const active = session.appointments.filter((appointment) =>
    (ACTIVE as readonly string[]).includes(appointment.status)
  );
  const due24h = active.filter(
    (appointment) => appointment.reminder24hSentAt == null && inWindow(appointment.startAt, window24h)
  );
  const due2h = active.filter(
    (appointment) => appointment.reminder2hSentAt == null && inWindow(appointment.startAt, window2h)
  );
  if (!opts.dryRun) {
    for (const appointment of due24h) {
      appointment.reminder24hSentAt = now.toISOString();
      pushBus(session, "appointment_reminder_24h", appointment.id, now);
    }
    for (const appointment of due2h) {
      appointment.reminder2hSentAt = now.toISOString();
      pushBus(session, "appointment_reminder_2h", appointment.id, now);
    }
  }
  const reminder = {
    dryRun: opts.dryRun,
    sent24h: due24h.length,
    sent2h: due2h.length,
    window24h,
    window2h,
  };
  session.reminder = reminder;
  return reminder;
}

export function confirmPending(
  session: Session,
  proposalId: string,
  now = new Date()
): { ok: true; reply: string } | { ok: false; error: string } {
  const proposal = session.pending;
  if (!proposal || proposal.id !== proposalId) {
    return { ok: false, error: "That card is no longer on the desk." };
  }
  session.pending = null;
  let written: Appointment;
  if (proposal.tool === "create_appointment") {
    const result = createAppointment(session, proposal, now);
    if (!result.ok) {
      session.pending = proposal;
      return result;
    }
    written = result.appointment;
  } else if (proposal.tool === "reschedule_appointment") {
    const result = rescheduleAppointment(session, proposal, now);
    if (!result.ok) {
      session.pending = proposal;
      return result;
    }
    written = result.appointment;
  } else {
    const result = cancelAppointment(session, proposal, now);
    if (!result.ok) {
      session.pending = proposal;
      return result;
    }
    written = result.appointment;
  }
  runAppointmentReminders(session, { dryRun: false, now });
  const service = serviceById(written.serviceId);
  const name = service?.name ?? "Appointment";
  const when = formatRange(written.startAt, written.endAt);
  const stamped = now.toISOString();
  const queued24 = written.reminder24hSentAt === stamped;
  const queued2 = written.reminder2hSentAt === stamped;
  const proof =
    proposal.tool === "cancel_appointment"
      ? "The reminder workflow skipped this row because it is cancelled."
      : queued24 || queued2
        ? `The reminder workflow found this row and queued ${[queued24 ? "a 24-hour reminder" : "", queued2 ? "a 2-hour reminder" : ""].filter(Boolean).join(" and ")}.`
        : "The reminder workflow read this row and sent nothing: the start is outside the 24-hour and 2-hour windows. The markers are empty, so a later run can still see it.";
  const verb =
    proposal.tool === "create_appointment"
      ? `Booked ${name}`
      : proposal.tool === "reschedule_appointment"
        ? `Moved ${name}`
        : `Cancelled ${name}`;
  return {
    ok: true,
    reply: `${verb}, ${when}. The calendar has the row. ${proof} Nothing was emailed or sent on WhatsApp.`,
  };
}

export function activeAppointment(session: Session, serviceId?: string): Appointment | null {
  const list = session.appointments.filter(
    (appointment) =>
      (ACTIVE as readonly string[]).includes(appointment.status) &&
      (!serviceId || appointment.serviceId === serviceId)
  );
  const future = list.filter((appointment) => new Date(appointment.startAt).getTime() > Date.now());
  const pool = (future.length > 0 ? future : list).slice();
  pool.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  return pool[0] ?? null;
}

export function staffForService(serviceId: string) {
  const service = serviceById(serviceId);
  if (!service) return null;
  return staffFor(service);
}
