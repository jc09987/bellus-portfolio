"use server";

import { confirmPending } from "@/lib/demo/book";
import { openSession, resetSession, saveSession } from "@/lib/demo/session";
import type { DeskMessage, DeskView } from "@/lib/demo/types";
import { resolveTurn } from "@/lib/concierge/resolve";
import { toDeskView } from "@/lib/demo/view";

function remember(messages: DeskMessage[], message: DeskMessage) {
  messages.push(message);
  if (messages.length > 12) messages.splice(0, messages.length - 12);
}

export async function loadDesk(): Promise<DeskView> {
  const session = openSession();
  saveSession(session);
  return toDeskView(session);
}

export async function askConcierge(text: string): Promise<DeskView> {
  const session = openSession();
  const turn = await resolveTurn(text, session);
  session.pending = turn.proposal;
  session.lastSlots = turn.slots;
  session.trace = turn.trace;
  remember(session.messages, { role: "staff", text: text.trim() });
  remember(session.messages, { role: "desk", text: turn.reply });
  saveSession(session);
  return toDeskView(session);
}

export async function confirmProposal(proposalId: string): Promise<DeskView> {
  const session = openSession();
  const result = confirmPending(session, proposalId);
  if (result.ok && session.trace) {
    session.trace = { ...session.trace, outcome: "written", detail: "Card confirmed. The write ran." };
  }
  remember(session.messages, { role: "desk", text: result.ok ? result.reply : result.error });
  saveSession(session);
  return toDeskView(session);
}

export async function dismissProposal(): Promise<DeskView> {
  const session = openSession();
  session.pending = null;
  remember(session.messages, { role: "desk", text: "Card dismissed. Nothing was written." });
  saveSession(session);
  return toDeskView(session);
}

export async function resetDesk(): Promise<DeskView> {
  return toDeskView(resetSession());
}
