import { createClient } from "@/lib/supabase/server";

export async function getAnalyticsOverview(clinicId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, stage, compliance_score, readiness_status, revenue_estimate, coordinator_name, doctor_review_status")
    .eq("clinic_id", clinicId);

  if (error) throw error;
  const patients = data ?? [];

  const totalPatients = patients.length;
  const readyPatients = patients.filter((p) => p.readiness_status === "ready").length;
  const averageComplianceScore =
    totalPatients === 0
      ? 0
      : Math.round(
          patients.reduce((acc, patient) => acc + Number(patient.compliance_score ?? 0), 0) /
            totalPatients,
        );
  const blockedByMissingDocuments = patients.filter((p) => p.readiness_status === "critical").length;
  const doctorReviewBacklog = patients.filter((p) => p.doctor_review_status === "pending").length;

  const estimatedRevenueByStage = patients.reduce<Record<string, number>>((acc, patient) => {
    const stage = patient.stage ?? "Unknown";
    acc[stage] = (acc[stage] ?? 0) + Number(patient.revenue_estimate ?? 0);
    return acc;
  }, {});

  const coordinatorWorkload = patients.reduce<Record<string, number>>((acc, patient) => {
    const coordinator = patient.coordinator_name ?? "Unassigned";
    acc[coordinator] = (acc[coordinator] ?? 0) + 1;
    return acc;
  }, {});

  const newLead = patients.filter((p) => p.stage === "New Lead").length;
  const completed = patients.filter((p) => p.stage === "Completed").length;
  const conversionRates = {
    leadToCompleted: newLead === 0 ? 0 : Number(((completed / newLead) * 100).toFixed(2)),
  };

  return {
    totalPatients,
    readyPatients,
    averageComplianceScore,
    blockedByMissingDocuments,
    doctorReviewBacklog,
    estimatedRevenueByStage,
    conversionRates,
    coordinatorWorkload,
  };
}
