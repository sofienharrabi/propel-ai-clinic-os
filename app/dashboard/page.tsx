import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/login/actions";

export default async function DashboardPage() {
  const context = {
    fullName: "Demo User",
    role: "admin" as const,
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Propel AI OS</p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 md:text-4xl">
              International Patient Operations Command Center
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Workflow intelligence, compliance readiness, AI coordination, and executive analytics in one system.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {context.fullName} - {context.role}
            </p>
          </div>

          <form action={signOutAction}>
            <Button variant="outline" type="submit">
              Logout
            </Button>
          </form>
        </div>

        <DashboardShell role={context.role} />
      </div>
    </main>
  );
}