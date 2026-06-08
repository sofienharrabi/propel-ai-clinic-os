import { assertPermission, createAuditEvent } from "@/lib/api-utils";
import { computeCompliance } from "@/lib/compliance";
import { createNotification } from "@/lib/notifications/service";
import { toPatient } from "@/lib/patient-mappers";
import { getSessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/validation/api";
import { syncReadinessSchema } from "@/lib/validation/schemas";

function riskLevel(score: number) {
  if (score >= 85) return "low";
  if (score >= 50) return "medium";
  return "high";
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);
  const { id } = await params;
  const parsed = syncReadinessSchema.safeParse({ patientId: id });
  if (!parsed.success) return errorResponse("Invalid patient id", 400);

  try {
    assertPermission(context, "compliance:validate");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("patients")
      .select("*, patient_documents(id, document_type, file_path, status, verified, uploaded_at)")
      .eq("id", id)
      .eq("clinic_id", context.clinicId)
      .single();

    if (error || !data) throw new Error(error?.message ?? "Patient not found");

    const patient = toPatient(data);
    const compliance = computeCompliance(patient);
    const ready = compliance.readinessStatus === "ready";

    const { error: updateError } = await supabase
      .from("patients")
      .update({
        compliance_score: compliance.complianceScore,
        readiness_status: compliance.readinessStatus,
        sync_ready: ready,
      })
      .eq("id", id)
      .eq("clinic_id", context.clinicId);

    if (updateError) throw new Error(updateError.message);

    const successMessage = "Patient file validated and prepared for official workflow. Ready for HealthTürkiye/USHAŞ manual submission.";
    const failMessage = "Missing required items before official workflow readiness.";

    await createAuditEvent({
      clinicId: context.clinicId,
      patientId: id,
      userId: context.userId,
      actorLabel: context.fullName,
      action: ready ? "compliance_validation_passed" : "compliance_validation_failed",
      description: ready ? successMessage : failMessage,
      metadata: {
        missingItems: compliance.missingItems,
        complianceScore: compliance.complianceScore,
      },
    });
    await createNotification({
      clinicId: context.clinicId,
      userId: context.userId,
      patientId: id,
      type: ready ? "ready_for_official_workflow" : "sync_failed",
      title: ready ? "Patient ready for official workflow preparation" : "Sync readiness failed",
      message: ready ? successMessage : failMessage,
    });

    await createAuditEvent({
      clinicId: context.clinicId,
      patientId: id,
      userId: context.userId,
      actorLabel: context.fullName,
      action: "sync_readiness_clicked",
      description: "Sync readiness validation executed",
      metadata: {},
    });

    return successResponse({
      ok: ready,
      message: ready ? successMessage : failMessage,
      compliance,
      riskLevel: riskLevel(compliance.complianceScore),
      recommendedActions:
        compliance.missingItems.length === 0
          ? ["Continue coordinator follow-up", "Proceed with manual official submission preparation"]
          : compliance.missingItems.map((item) => `Resolve: ${item}`),
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 400);
  }
}
