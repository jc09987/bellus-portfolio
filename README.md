# Bellus Lab

Public portfolio demo: a staff concierge for a seeded beauty studio.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What the demo shows

1. **Send** `book a facial Thursday after 5`. The desk searches the seed calendar and shows a confirmation card. The calendar does not change yet.
2. **Confirm the card.** The facial appears as a row. The reminder workflow then reads that row. A 24-hour or 2-hour reminder is queued only when the start time is inside that window.
3. **Ask it to email or WhatsApp the guest.** The model is not called. Nothing is written.

The guest on a new booking is the seeded walk-in, `guest@example.com`. The studio menu and staff come from the Bellus Lab seed. No live salon is attached.

## Tool boundary

A model may return only:

`search_slots` · `create_appointment` · `reschedule_appointment` · `cancel_appointment` · `reply`

Any other tool, or an extra key, is rejected and is not applied. Search runs immediately. Create, reschedule, and cancel become a card. The write runs only when that card is confirmed.

Email and WhatsApp are not tools. In the full studio those messages leave through the n8n workflows in `n8n/`, after a row exists. This demo records the bus event and does not deliver it, so a bad generation cannot reach a guest.

`GET /api/cron/appointment-reminders` is the route those workflows call. It stays closed until `CRON_SECRET` is set. `?dryRun=1` reports the windows without marking reminders sent.

## Eval

`evals/messages.json` checks the demo line, a search, channel refusals, cancel, and reschedule. Each case must leave the calendar unchanged until a separate confirm.

```bash
npm run eval
```

Results land in `evals/results.json` and on the home page.

## Optional model

Without `OPENAI_API_KEY`, the desk uses the parser. With a key, the model is asked for the same JSON shapes. A rejected shape is not applied. Copy `.env.example` to `.env.local` if you want the model.
