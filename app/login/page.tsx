import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signInAction, signUpAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel w-full max-w-md rounded-2xl border p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Secure Clinic Access</p>
        <h1 className="mt-2 text-2xl font-semibold">Propel AI Sign In</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Supabase auth wiring is ready. Connect environment variables to enable production login.
        </p>
        {params.error ? (
          <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
            {params.error}
          </p>
        ) : null}
        <form className="mt-6 space-y-3" action={signInAction}>
          <input
            name="email"
            placeholder="Work email"
            className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none ring-cyan-400 focus:ring-1"
          />
          <input
            name="password"
            placeholder="Password"
            type="password"
            className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none ring-cyan-400 focus:ring-1"
          />
          <Button className="w-full" type="submit">
            Sign In
          </Button>
        </form>
        <form className="mt-3 space-y-3" action={signUpAction}>
          <input
            name="fullName"
            placeholder="Full name for signup"
            className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none ring-cyan-400 focus:ring-1"
          />
          <input
            name="email"
            placeholder="Email for signup"
            className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none ring-cyan-400 focus:ring-1"
          />
          <input
            name="password"
            placeholder="Password"
            type="password"
            className="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none ring-cyan-400 focus:ring-1"
          />
          <Button className="w-full" variant="outline" type="submit">
            Sign Up
          </Button>
        </form>
        <Link href="/" className="mt-4 block text-center text-xs text-zinc-500 underline">
          Back to landing page
        </Link>
      </div>
    </main>
  );
}
