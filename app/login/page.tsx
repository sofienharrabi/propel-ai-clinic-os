import Link from "next/link";
import { signInAction, signUpAction } from "./actions";
import { SubmitButton } from "./submit-button";

const inputCls =
  "h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm outline-none ring-cyan-400 focus:ring-1";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab ?? "signin";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-panel w-full max-w-md rounded-2xl border p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Secure Clinic Access</p>
        <h1 className="mt-2 text-2xl font-semibold">Propel AI</h1>

        <div className="mt-4 flex rounded-lg border border-zinc-800 p-1">
          <Link
            href="/login?tab=signin"
            className={`flex-1 rounded-md py-2 text-center text-sm transition-colors ${
              tab === "signin" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign In
          </Link>
          <Link
            href="/login?tab=signup"
            className={`flex-1 rounded-md py-2 text-center text-sm transition-colors ${
              tab === "signup" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Create Account
          </Link>
        </div>

        {params.error ? (
          <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
            {params.error}
          </p>
        ) : null}

        {tab === "signin" ? (
          <form className="mt-6 space-y-3" action={signInAction}>
            <input
              name="email"
              type="email"
              placeholder="Work email"
              required
              className={inputCls}
            />
            <input
              name="password"
              placeholder="Password"
              type="password"
              required
              className={inputCls}
            />
            <SubmitButton className="w-full">Sign In</SubmitButton>
          </form>
        ) : (
          <form className="mt-6 space-y-3" action={signUpAction}>
            <input
              name="clinicName"
              placeholder="Clinic name"
              required
              className={inputCls}
            />
            <input
              name="fullName"
              placeholder="Your full name"
              required
              className={inputCls}
            />
            <input
              name="email"
              type="email"
              placeholder="Work email"
              required
              className={inputCls}
            />
            <input
              name="password"
              placeholder="Password (min 8 characters)"
              type="password"
              required
              minLength={8}
              className={inputCls}
            />
            <SubmitButton className="w-full" variant="outline">
              Create Account &amp; Start 30-Day Trial
            </SubmitButton>
          </form>
        )}

        <Link href="/" className="mt-4 block text-center text-xs text-zinc-500 underline">
          Back to landing page
        </Link>
      </div>
    </main>
  );
}
