import { writeFileSync } from "node:fs";
import { confirmPending, createSession } from "../lib/demo/book";
import { decodeSession, encodeSession } from "../lib/demo/persist";
import { acceptTool } from "../lib/concierge/schema";
import { resolveLocal } from "../lib/concierge/resolve";
import { inWindow, windowForHoursAhead } from "../lib/appointments/reminders";
import { DEMO_LINE } from "../lib/demo/types";
import cases from "../evals/messages.json";

type Row = {
  id: string;
  text: string;
  expect: string;
  afterDemo?: boolean;
};

function actualOf(turn: ReturnType<typeof resolveLocal>): string {
  if (turn.trace.outcome === "rejected") return "rejected";
  if (turn.trace.outcome === "slots") return "search_slots";
  return turn.proposal?.tool ?? "reply";
}

function bookDemo(session: ReturnType<typeof createSession>) {
  const turn = resolveLocal(DEMO_LINE, session);
  if (!turn.proposal) throw new Error("Demo line did not prepare a card.");
  session.pending = turn.proposal;
  const confirmed = confirmPending(session, turn.proposal.id);
  if (!confirmed.ok) throw new Error(confirmed.error);
  return turn.proposal.tool === "create_appointment" ? turn.proposal.start : null;
}

const results = (cases as Row[]).map((row) => {
  const session = createSession();
  if (row.afterDemo) bookDemo(session);
  const before = JSON.stringify(session.appointments);
  const turn = resolveLocal(row.text, session);
  const actual = actualOf(turn);
  const unchanged = JSON.stringify(session.appointments) === before;
  return {
    id: row.id,
    text: row.text,
    expect: row.expect,
    actual,
    pass: actual === row.expect && unchanged,
    detail: turn.reply,
  };
});

const session = createSession();
const beforeIds = session.appointments.map((appointment) => appointment.id);
const prepared = resolveLocal(DEMO_LINE, session);
const wroteEarly = session.appointments.map((appointment) => appointment.id).join() !== beforeIds.join();
session.pending = prepared.proposal;
const confirmed = prepared.proposal ? confirmPending(session, prepared.proposal.id) : { ok: false as const, error: "no card" };
const created = session.appointments.find((appointment) => appointment.source === "concierge");
const now = new Date();
const due24 = created ? inWindow(created.startAt, windowForHoursAhead(now, 24)) : false;
const due2 = created ? inWindow(created.startAt, windowForHoursAhead(now, 2)) : false;
const reminderForRow = session.bus.filter(
  (event) =>
    created &&
    event.appointmentId === created.id &&
    (event.event === "appointment_reminder_24h" || event.event === "appointment_reminder_2h")
);
const confirmPass =
  prepared.proposal?.tool === "create_appointment" &&
  !wroteEarly &&
  confirmed.ok &&
  created != null &&
  session.bus.some((event) => event.event === "appointment_created" && event.appointmentId === created.id) &&
  session.bus.every((event) => event.delivered === false) &&
  reminderForRow.length === Number(due24) + Number(due2);

const carried = createSession();
const carriedTurn = resolveLocal(DEMO_LINE, carried);
carried.pending = carriedTurn.proposal;
const restored = decodeSession(encodeSession(carried));
const restoredConfirm =
  restored?.pending && restored.pending.id === carriedTurn.proposal?.id
    ? confirmPending(restored, restored.pending.id)
    : { ok: false as const, error: "cookie lost the card" };
const cookiePass =
  restoredConfirm.ok &&
  restored?.appointments.some((appointment) => appointment.source === "concierge") === true &&
  encodeSession(restored!).every((chunk) => chunk.length <= 3000);

results.push({
  id: "cookie-carries-card",
  text: "confirm a card restored from the cookie",
  expect: "appointment_created",
  actual: cookiePass ? "appointment_created" : "miss",
  pass: cookiePass,
  detail: restoredConfirm.ok ? restoredConfirm.reply : restoredConfirm.error,
});

results.push({
  id: "confirm-writes",
  text: "confirm the demo card",
  expect: "appointment_created",
  actual: confirmPass ? "appointment_created" : "miss",
  pass: confirmPass,
  detail: confirmed.ok ? confirmed.reply : confirmed.error,
});

const schemaChecks = [
  { name: "send_email rejected", pass: !acceptTool({ tool: "send_email" }).ok },
  { name: "whatsapp key rejected", pass: !acceptTool({ tool: "create_appointment", service: "facial", channel: "whatsapp" }).ok },
  {
    name: "create shape accepted",
    pass: acceptTool({ tool: "create_appointment", service: "facial", weekday: "thursday", after: "17:00" }).ok,
  },
];

const caseSummary = {
  pass: results.filter((row) => row.pass).length,
  fail: results.filter((row) => !row.pass).length,
  total: results.length,
};

const output = {
  ranAt: new Date().toISOString(),
  note: "Parser and confirmation boundary. No model call, no email, no WhatsApp.",
  summary: caseSummary,
  cases: results,
  schemaChecks,
};

writeFileSync(new URL("../evals/results.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);

const failed = [...results, ...schemaChecks.map((row) => ({ id: row.name, pass: row.pass, actual: "", expect: "", text: row.name, detail: "" }))].filter(
  (row) => !row.pass
);
if (failed.length > 0) {
  console.error(failed);
  process.exit(1);
}
console.log(`${caseSummary.pass}/${caseSummary.total} cases, ${schemaChecks.filter((row) => row.pass).length}/${schemaChecks.length} schema`);
