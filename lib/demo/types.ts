export const DEMO_LINE = "book a facial Thursday after 5";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export type Appointment = {
  id: string;
  serviceId: string;
  staffId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  reminder24hSentAt: string | null;
  reminder2hSentAt: string | null;
  source: "seed" | "concierge";
};

export type Slot = { start: string; end: string };

export type Proposal =
  | {
      id: string;
      tool: "create_appointment";
      serviceId: string;
      staffId: string;
      start: string;
      end: string;
      clientName: string;
      clientEmail: string;
      clientPhone: string;
    }
  | {
      id: string;
      tool: "reschedule_appointment";
      appointmentId: string;
      serviceId: string;
      staffId: string;
      start: string;
      end: string;
    }
  | {
      id: string;
      tool: "cancel_appointment";
      appointmentId: string;
      serviceId: string;
    };

export type BusEventName =
  | "appointment_created"
  | "appointment_rescheduled"
  | "appointment_canceled"
  | "appointment_reminder_24h"
  | "appointment_reminder_2h";

export type BusEvent = {
  id: string;
  at: string;
  event: BusEventName;
  appointmentId: string;
  workflow: string;
  delivered: false;
};

export type ReminderRun = {
  dryRun: boolean;
  sent24h: number;
  sent2h: number;
  window24h: { startIso: string; endIso: string };
  window2h: { startIso: string; endIso: string };
};

export type Trace = {
  source: "parser" | "model" | "guard";
  outcome: "proposal" | "slots" | "reply" | "rejected" | "written";
  tool: string | null;
  model: string | null;
  latencyMs: number | null;
  costUsd: number | null;
  detail: string;
};

export type DeskMessage = { role: "staff" | "desk"; text: string };

export type DeskAppointment = {
  id: string;
  serviceName: string;
  staffName: string;
  clientName: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  source: "seed" | "concierge";
};

export type DeskPending = {
  id: string;
  tool: Proposal["tool"];
  heading: string;
  detail: string;
  startAt: string | null;
  endAt: string | null;
  appointmentId: string | null;
};

export type DeskView = {
  appointments: DeskAppointment[];
  pending: DeskPending | null;
  slotLabels: string[];
  bus: BusEvent[];
  reminder: ReminderRun | null;
  messages: DeskMessage[];
  trace: Trace | null;
};

export type Session = {
  appointments: Appointment[];
  pending: Proposal | null;
  lastSlots: Slot[];
  bus: BusEvent[];
  reminder: ReminderRun | null;
  messages: DeskMessage[];
  trace: Trace | null;
};

export const WORKFLOWS: Record<BusEventName, string> = {
  appointment_created: "n8n/bellus-appointment-created.workflow.json",
  appointment_rescheduled: "n8n/bellus-appointment-rescheduled.workflow.json",
  appointment_canceled: "n8n/bellus-appointment-canceled.workflow.json",
  appointment_reminder_24h: "n8n/bellus-appointment-reminder-24h.workflow.json",
  appointment_reminder_2h: "n8n/bellus-appointment-reminder-2h.workflow.json",
};
