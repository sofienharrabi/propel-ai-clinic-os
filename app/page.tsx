import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { ReactNode } from "react";

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <div className="mx-auto max-w-7xl space-y-16">
        <header className="glass-panel rounded-2xl border p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Propel AI</h1>
            <Link
              href="/dashboard"
              className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20"
            >
              Open Platform
            </Link>
          </div>
        </header>

        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Operational Intelligence for International Patient Departments</p>
            <h2 className="text-4xl font-semibold leading-tight md:text-6xl">
              Reduce workflow chaos. Improve compliance visibility.
            </h2>
            <p className="max-w-xl text-zinc-400">
              A premium AI operating system for medical tourism clinics in Turkey, designed to centralize patient operations, improve coordinator productivity, and increase booked treatments.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-5 py-3 font-medium text-black transition hover:bg-cyan-300">
                Start Command Center <ArrowRight size={16} />
              </Link>
              <button className="rounded-lg border border-zinc-700 px-5 py-3 text-zinc-300">Book Demo</button>
            </div>
          </div>
          <div className="glass-panel rounded-2xl border p-6">
            <div className="grid gap-3 md:grid-cols-2">
              <Feature title="Pipeline Intelligence" icon={<Workflow size={16} />} text="Drag-and-drop clinical workflow with real-time operational coordination." />
              <Feature title="Compliance Engine" icon={<ShieldCheck size={16} />} text="Readiness scoring, missing-file detection, and audit visibility in one system." />
              <Feature title="AI Operations Layer" icon={<Sparkles size={16} />} text="Multilingual responses, bottleneck prediction, and next-best action suggestions." />
              <Feature title="Premium Analytics" icon={<ArrowRight size={16} />} text="Conversion, productivity, forecast revenue, and treatment demand visibility." />
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          <Stat title="Compliance mistakes reduced" value="38%" />
          <Stat title="Coordinator speed increase" value="2.1x" />
          <Stat title="Average booking lift" value="+27%" />
        </section>
      </div>
    </main>
  );
}

function Feature({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="mb-2 inline-flex rounded-md bg-cyan-500/15 p-2 text-cyan-300">{icon}</div>
      <p className="text-sm font-semibold text-zinc-100">{title}</p>
      <p className="mt-1 text-xs text-zinc-400">{text}</p>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass-panel rounded-xl border p-6">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-2 text-4xl font-semibold text-cyan-300">{value}</p>
    </div>
  );
}
