"use client";

import { Patient } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { computeUshasScore } from "./UshasComplianceBadge";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

export function UshasComplianceSummary({ patients }: { patients: Patient[] }) {
  const active = patients.filter((p) => !p.archived);

  const readyCount = active.filter((p) => computeUshasScore(p).status === "ready").length;
  const incompleteCount = active.filter(
    (p) => computeUshasScore(p).status === "incomplete",
  ).length;
  const atRiskCount = active.filter(
    (p) => computeUshasScore(p).status === "at_risk",
  ).length;

  const overallPct = active.length
    ? Math.round((readyCount / active.length) * 100)
    : 100;

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-100">USHAŞ Compliance Overview</h3>

      {atRiskCount > 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <span>
            Missing patient data may result in USHAŞ violations and license penalties
          </span>
        </div>
      )}

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2">
          <p className="text-lg font-semibold text-emerald-400">{readyCount}</p>
          <p className="text-zinc-400">Ready</p>
        </div>
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2">
          <p className="text-lg font-semibold text-yellow-400">{incompleteCount}</p>
          <p className="text-zinc-400">Incomplete</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2">
          <p className="text-lg font-semibold text-red-400">{atRiskCount}</p>
          <p className="text-zinc-400">At Risk</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Overall compliance</span>
          <span className="font-medium text-zinc-100">{overallPct}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <motion.div
            className="h-full rounded-full bg-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </Card>
  );
}
