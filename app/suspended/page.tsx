import Link from "next/link";
import { ShieldOff, MessageCircle } from "lucide-react";

export default function SuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel w-full max-w-md rounded-2xl border p-8 text-center">
        <div className="mb-4 inline-flex rounded-full bg-red-500/10 p-4">
          <ShieldOff className="text-red-400" size={32} />
        </div>

        <p className="text-xs uppercase tracking-[0.18em] text-red-300">Account Access</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-100">
          Your 30-day trial has ended
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Your data is safe. Contact us to continue using Propel AI and access your patient
          operations command center.
        </p>

        <div className="mt-8 space-y-3">
          <a
            href="https://wa.me/905321234567"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 font-medium text-white transition hover:bg-emerald-400"
          >
            <MessageCircle size={18} />
            Contact Us on WhatsApp
          </a>
          <Link
            href="/login"
            className="block text-center text-xs text-zinc-500 underline"
          >
            Sign in to a different account
          </Link>
        </div>
      </div>
    </main>
  );
}
