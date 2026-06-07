import { Patient } from "@/lib/types";
import { cn } from "@/lib/utils";

const USHAS_FIELDS: { key: keyof Patient; label: string }[] = [
  { key: "name", label: "Full name" },
  { key: "nationality", label: "Nationality" },
  { key: "treatmentType", label: "Treatment type" },
  { key: "passportNumber", label: "Passport number" },
  { key: "arrivalDate", label: "Arrival date" },
  { key: "departureDate", label: "Departure date" },
  { key: "emergencyContact", label: "Emergency contact" },
  { key: "paymentStatus", label: "Payment status" },
];

export function computeUshasScore(patient: Patient): {
  score: number;
  filledCount: number;
  missingFields: string[];
  status: "ready" | "incomplete" | "at_risk";
} {
  const missingFields: string[] = [];

  for (const { key, label } of USHAS_FIELDS) {
    const value = patient[key];
    const isEmpty =
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "");
    if (isEmpty) missingFields.push(label);
  }

  const filledCount = USHAS_FIELDS.length - missingFields.length;
  const score = Math.round((filledCount / USHAS_FIELDS.length) * 100);

  const status =
    filledCount >= 8 ? "ready" : filledCount >= 5 ? "incomplete" : "at_risk";

  return { score, filledCount, missingFields, status };
}

export function UshasComplianceBadge({ patient }: { patient: Patient }) {
  const { status } = computeUshasScore(patient);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        status === "ready" &&
          "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
        status === "incomplete" &&
          "border border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
        status === "at_risk" &&
          "border border-red-500/40 bg-red-500/10 text-red-400",
      )}
    >
      {status === "ready" && "USHAŞ Ready"}
      {status === "incomplete" && "Incomplete"}
      {status === "at_risk" && "At Risk"}
    </span>
  );
}
