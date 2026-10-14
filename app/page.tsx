import { Desk } from "@/components/Desk";
import results from "@/evals/results.json";

const TOOLS = [
  { name: "searchSlots", write: "Read" },
  { name: "createAppointment", write: "Card, then write" },
  { name: "rescheduleAppointment", write: "Card, then write" },
  { name: "cancelAppointment", write: "Card, then write" },
];

export default function Home() {
  return (
    <div>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        {/* Logo SVG is already sized; the optimizer does not help it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-light.svg" alt="Bellus Lab" className="h-10 w-auto" />
        <p className="text-sm font-semibold text-stone-500">Seed studio</p>
      </header>
      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-8 pt-2">
          <p className="text-sm font-black tracking-[0.28em] text-brand-700">BELLUS LAB</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-none text-ink sm:text-6xl">
            A staff concierge for the appointment book.
          </h1>
          <p className="mt-4 max-w-2xl text-base font-semibold text-stone-600">
            The tools are the ones the desk already had: search slots, create an appointment,
            reschedule, and cancel. A confirmation card sits in front of every write. Email and
            WhatsApp stay on the n8n bus, so a bad generation cannot reach a guest.
          </p>
        </section>

        <section id="desk" className="mx-auto w-full max-w-6xl px-6 pb-16">
          <Desk />
        </section>

        <section id="boundary" className="border-t border-brand-100 bg-white py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <h2 className="font-display text-3xl text-ink">What the model is allowed to return</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold text-stone-600">
              A message that asks for email or WhatsApp is refused before a model call. Any other
              tool name, or an extra key such as a recipient, is rejected and is not applied. The
              seeded walk-in is the only guest a booking can name.
            </p>
            <table className="mt-6 w-full text-left text-sm">
              <thead>
                <tr className="text-xs tracking-wide text-stone-500">
                  <th className="py-2 pr-3 font-bold">Tool</th>
                  <th className="py-2 font-bold">When it runs</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((tool) => (
                  <tr key={tool.name} className="border-t border-stone-100">
                    <td className="py-2 pr-3 font-black text-ink">{tool.name}</td>
                    <td className="py-2 text-stone-600">{tool.write}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-6 max-w-3xl text-sm font-semibold text-stone-600">
              After a confirm, the row is on the calendar and{" "}
              <code className="text-xs">n8n/bellus-cron-appointment-reminders.workflow.json</code> is
              the proof: it reads appointments whose reminder markers are empty. The 24-hour and
              2-hour windows match the studio cron, ±1 hour. This demo records the bus event and
              does not send it.
            </p>
          </div>
        </section>

        <section id="eval" className="border-t border-brand-100 py-16">
          <div className="mx-auto w-full max-w-6xl px-6">
            <h2 className="font-display text-3xl text-ink">Parser checks</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold text-stone-600">
              {results.summary.pass} pass, {results.summary.fail} fail of {results.summary.total}.{" "}
              {results.note} Schema checks: {results.schemaChecks.filter((item) => item.pass).length}/
              {results.schemaChecks.length} pass. Ran {results.ranAt.slice(0, 10)}.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="text-xs tracking-wide text-stone-500">
                    <th className="py-2 pr-3 font-bold">Result</th>
                    <th className="py-2 pr-3 font-bold">Message</th>
                    <th className="py-2 pr-3 font-bold">Expected</th>
                    <th className="py-2 font-bold">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cases.map((row) => (
                    <tr key={row.id} className="border-t border-stone-100 align-top">
                      <td className="py-2 pr-3 font-black text-ink">{row.pass ? "pass" : "fail"}</td>
                      <td className="py-2 pr-3 font-semibold text-ink">{row.text}</td>
                      <td className="py-2 pr-3 text-stone-600">{row.expect}</td>
                      <td className="py-2 text-stone-600">{row.actual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
