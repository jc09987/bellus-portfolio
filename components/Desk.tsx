"use client";

import { useEffect, useState } from "react";
import {
  askConcierge,
  confirmProposal,
  dismissProposal,
  loadDesk,
  resetDesk,
} from "@/app/concierge/actions";
import { DEMO_LINE, type DeskView } from "@/lib/demo/types";

function dayKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function daysToShow(desk: DeskView | null) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const stamps = [
    ...(desk?.appointments ?? []).map((appointment) => appointment.startAt),
    desk?.pending?.startAt ?? null,
  ].filter((value): value is string => Boolean(value));
  let count = 7;
  for (const iso of stamps) {
    const date = new Date(iso);
    date.setHours(0, 0, 0, 0);
    const diff = Math.round((date.getTime() - start.getTime()) / 86_400_000) + 1;
    if (diff > count) count = diff;
  }
  return upcomingDays(Math.min(count, 14));
}

function upcomingDays(count: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function clock(iso: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export function Desk() {
  const [desk, setDesk] = useState<DeskView | null>(null);
  const [text, setText] = useState(DEMO_LINE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadDesk()
      .then((next) => {
        if (live) setDesk(next);
      })
      .catch(() => {
        if (live) setError("The desk did not open.");
      });
    return () => {
      live = false;
    };
  }, []);

  async function run(action: () => Promise<DeskView>) {
    setBusy(true);
    setError(null);
    try {
      setDesk(await action());
    } catch {
      setError("The desk could not finish that.");
    } finally {
      setBusy(false);
    }
  }

  const days = daysToShow(desk);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="rounded-3xl border border-brand-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black tracking-[0.18em] text-brand-700">STAFF</p>
        <p className="mt-1 text-sm text-stone-600">The demo line books a facial. The card is the write.</p>
        <label className="mt-4 block text-xs font-bold text-stone-500" htmlFor="desk-text">
          Message
        </label>
        <textarea
          id="desk-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-ink"
        />
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setText(DEMO_LINE);
              void run(() => askConcierge(DEMO_LINE));
            }}
            className="rounded-full bg-brand-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {DEMO_LINE}
          </button>
          <button
            type="button"
            disabled={busy || text.trim() === ""}
            onClick={() => void run(() => askConcierge(text))}
            className="rounded-full border border-stone-300 px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-60"
          >
            Send to the concierge
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(resetDesk)}
            className="rounded-full px-4 py-2 text-sm font-bold text-stone-500"
          >
            Reset the seed calendar
          </button>
        </div>
        {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <Transcript desk={desk} />
        {desk?.pending ? (
          <div className="mt-4 rounded-2xl border border-nude-500 bg-nude-300/20 p-4">
            <p className="text-xs font-black tracking-[0.16em] text-nude-700">CONFIRMATION CARD</p>
            <h3 className="mt-1 font-display text-2xl text-ink">{desk.pending.heading}</h3>
            <p className="mt-1 text-sm font-semibold text-stone-700">{desk.pending.detail}</p>
            <p className="mt-2 text-xs text-stone-500">
              Confirm calls the write. Dismiss leaves the calendar as it is.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => confirmProposal(desk.pending!.id))}
                className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Confirm
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(dismissProposal)}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 disabled:opacity-60"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        <Trace desk={desk} />
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl text-ink">Calendar</h2>
            <p className="text-xs font-semibold text-stone-500">09:00–19:00 · seed studio</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {days.map((day) => {
              const key = dayKey(day.toISOString());
              const rows = (desk?.appointments ?? []).filter((appointment) => dayKey(appointment.startAt) === key);
              const ghost =
                desk?.pending?.startAt && dayKey(desk.pending.startAt) === key ? desk.pending : null;
              const entries = [
                ...(ghost?.startAt
                  ? [
                      {
                        start: ghost.startAt,
                        node: (
                          <li
                            key="waiting"
                            className="rounded-xl border border-dashed border-nude-500 bg-white px-2 py-2 text-xs font-semibold text-stone-600"
                          >
                            {clock(ghost.startAt)} · {ghost.heading}
                            <span className="mt-1 block font-bold text-nude-700">Waiting for confirmation</span>
                          </li>
                        ),
                      },
                    ]
                  : []),
                ...rows.map((appointment) => {
                  const fresh = appointment.source === "concierge" && appointment.status !== "cancelled";
                  const doomed =
                    desk?.pending?.appointmentId === appointment.id && desk.pending.tool === "cancel_appointment";
                  return {
                    start: appointment.startAt,
                    node: (
                      <li
                        key={appointment.id}
                        className={`rounded-xl px-2 py-2 text-xs ${
                          appointment.status === "cancelled"
                            ? "bg-stone-200/70 text-stone-400 line-through"
                            : fresh
                              ? "bg-brand-100 font-semibold text-ink"
                              : "bg-white font-semibold text-stone-700"
                        }`}
                      >
                        <span className="block">
                          {clock(appointment.startAt)}–{clock(appointment.endAt)}
                        </span>
                        <span className="block">{appointment.serviceName}</span>
                        <span className="block font-medium">{appointment.staffName}</span>
                        {fresh ? <span className="mt-1 block font-black text-brand-700">On the calendar</span> : null}
                        {doomed ? <span className="mt-1 block font-black text-nude-700">Will cancel</span> : null}
                      </li>
                    ),
                  };
                }),
              ].sort((a, b) => a.start.localeCompare(b.start));
              return (
                <div key={key} className="rounded-2xl bg-stone-50 p-3">
                  <p className="text-xs font-black tracking-wide text-stone-500">
                    {day.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {entries.map((entry) => entry.node)}
                    {entries.length === 0 ? <li className="text-xs text-stone-400">Open</li> : null}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
        <Bus desk={desk} />
      </div>
    </div>
  );
}

function Transcript({ desk }: { desk: DeskView | null }) {
  if (!desk || desk.messages.length === 0) {
    return (
      <p className="mt-4 text-sm text-stone-500">
        Send the demo line. A card appears before the calendar changes.
      </p>
    );
  }
  return (
    <ol className="mt-4 space-y-2">
      {desk.messages.slice(-4).map((message, index) => (
        <li
          key={`${message.role}-${index}`}
          className={`rounded-2xl px-3 py-2 text-sm ${
            message.role === "staff" ? "bg-stone-100 font-semibold text-ink" : "bg-brand-100 text-stone-800"
          }`}
        >
          <span className="mr-2 text-xs font-black tracking-wide text-stone-500">
            {message.role === "staff" ? "STAFF" : "DESK"}
          </span>
          {message.text}
        </li>
      ))}
    </ol>
  );
}

function Trace({ desk }: { desk: DeskView | null }) {
  const trace = desk?.trace;
  if (!trace) return null;
  return (
    <dl className="mt-4 grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="font-bold text-stone-500">Source</dt>
      <dd className="font-semibold text-ink">{trace.source}</dd>
      <dt className="font-bold text-stone-500">Outcome</dt>
      <dd className="font-semibold text-ink">{trace.outcome}</dd>
      <dt className="font-bold text-stone-500">Tool</dt>
      <dd className="font-semibold text-ink">{trace.tool ?? "—"}</dd>
      <dt className="font-bold text-stone-500">Model</dt>
      <dd className="font-semibold text-ink">
        {trace.model ?? "—"}
        {trace.latencyMs != null ? ` · ${trace.latencyMs} ms` : ""}
        {trace.costUsd != null ? ` · $${trace.costUsd}` : ""}
      </dd>
    </dl>
  );
}

function Bus({ desk }: { desk: DeskView | null }) {
  const reminder = desk?.reminder;
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="font-display text-2xl text-ink">Reminder workflow</h2>
      <p className="mt-1 text-sm text-stone-600">
        A confirmed write emits <code className="text-xs">appointment_created</code>. The reminder cron then reads the
        row. These events are recorded here and are not delivered to a guest.
      </p>
      {reminder ? (
        <p className="mt-3 text-sm font-semibold text-ink">
          Last run: {reminder.sent24h} at 24h, {reminder.sent2h} at 2h.
          {reminder.dryRun ? " Dry run." : ""}
        </p>
      ) : (
        <p className="mt-3 text-sm text-stone-500">The workflow runs after a confirmed write.</p>
      )}
      <ul className="mt-3 space-y-2">
        {(desk?.bus ?? []).map((event) => (
          <li key={event.id} className="rounded-xl bg-stone-50 px-3 py-2 text-sm">
            <span className="font-black text-ink">{event.event}</span>
            <span className="mt-1 block text-xs text-stone-500">{event.workflow}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
