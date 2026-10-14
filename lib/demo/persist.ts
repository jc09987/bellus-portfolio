import { deflateSync, inflateSync } from "node:zlib";
import type { Appointment, Proposal, Session } from "@/lib/demo/types";

const CHUNK = 3000;
const MAX_CHUNKS = 8;

const STATUSES = new Set(["pending", "confirmed", "cancelled"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAppointment(value: unknown): value is Appointment {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.serviceId === "string" &&
    typeof value.staffId === "string" &&
    typeof value.clientName === "string" &&
    typeof value.clientEmail === "string" &&
    typeof value.startAt === "string" &&
    typeof value.endAt === "string" &&
    STATUSES.has(String(value.status)) &&
    (value.source === "seed" || value.source === "concierge")
  );
}

function isProposal(value: unknown): value is Proposal {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.tool !== "string") return false;
  if (value.tool === "create_appointment") {
    return typeof value.serviceId === "string" && typeof value.start === "string" && typeof value.end === "string";
  }
  if (value.tool === "reschedule_appointment") {
    return typeof value.appointmentId === "string" && typeof value.start === "string" && typeof value.end === "string";
  }
  if (value.tool === "cancel_appointment") {
    return typeof value.appointmentId === "string" && typeof value.serviceId === "string";
  }
  return false;
}

export function isSession(value: unknown): value is Session {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.appointments) || !value.appointments.every(isAppointment)) return false;
  if (value.pending != null && !isProposal(value.pending)) return false;
  if (!Array.isArray(value.lastSlots) || !Array.isArray(value.bus) || !Array.isArray(value.messages)) return false;
  return true;
}

function pack(session: Session): string[] {
  const packed = deflateSync(Buffer.from(JSON.stringify(session))).toString("base64url");
  const chunks: string[] = [];
  for (let index = 0; index < packed.length; index += CHUNK) {
    chunks.push(packed.slice(index, index + CHUNK));
  }
  return chunks.length > 0 ? chunks : [""];
}

/** Compress the desk so it fits in cookies a later process can read. */
export function encodeSession(session: Session): string[] {
  const copy: Session = {
    ...session,
    messages: session.messages.slice(-12),
    bus: session.bus.slice(-12),
    lastSlots: session.lastSlots.slice(0, 16),
  };
  let chunks = pack(copy);
  while (chunks.length > MAX_CHUNKS && copy.messages.length > 2) {
    copy.messages = copy.messages.slice(1);
    chunks = pack(copy);
  }
  if (chunks.length > MAX_CHUNKS) {
    copy.bus = copy.bus.slice(-4);
    copy.lastSlots = [];
    chunks = pack(copy);
  }
  if (chunks.length > MAX_CHUNKS) {
    throw new Error("The desk is too large to store.");
  }
  return chunks;
}

export function decodeSession(chunks: string[]): Session | null {
  if (chunks.length === 0 || chunks.length > MAX_CHUNKS) return null;
  try {
    const json = inflateSync(Buffer.from(chunks.join(""), "base64url")).toString("utf8");
    const parsed: unknown = JSON.parse(json);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function sessionCookieNames(count = MAX_CHUNKS): string[] {
  return Array.from({ length: count }, (_, index) => `bellus_${index}`);
}

export const SESSION_CHUNK_LIMIT = MAX_CHUNKS;
