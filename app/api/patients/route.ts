import { createAuditEvent } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications/service";
import { getSessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { assertPermission } from "@/lib/api-utils";
import { toPatient } from "@/lib/patient-mappers";
import { errorResponse, parseJson, successResponse } from "@/lib/validation/api";
import { patientCreateSchema } from "@/lib/validation/schemas";

export async function GET() {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patients")
    .select(
      "id, clinic_id, name, phone, email, nationality, treatment_type, stage, risk_score, compliance_score, readiness_status, revenue_estimate, coordinator_name, notes, doctor_note, timeline_status, ai_insights, booking_probability, doctor_review_status, sync_ready, updated_at, patient_documents(id, document_type, file_path, status, verified, uploaded_at)",
    )
    .eq("clinic_id", context.clinicId)
    .order("updated_at", { ascending: false });

  if (error) return errorResponse(error.message, 500);
  return successResponse({ patients: (data ?? []).map(toPatient) });
}

export async function POST(request: Request) {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);

  try {
    assertPermission(context, "patient:create");
    const parsed = await parseJson(request, patientCreateSchema);
    if (!parsed.ok) return errorResponse(parsed.error, 400, parsed.details);
    const body = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("patients")
      .insert({
        clinic_id: context.clinicId,
        name: body.name,
        phone: body.phone ?? null,
        email: body.email ?? null,
        nationality: body.nationality,
        treatment_type: body.treatmentType,
        revenue_estimate: body.estimatedRevenue ?? 0,
        stage: body.stage ?? "New Lead",
        coordinator_id: context.userId,
        coordinator_name: body.assignedCoordinator ?? context.fullName,
        notes: body.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Failed to create patient");

    await createAuditEvent({
      clinicId: context.clinicId,
      patientId: data.id,
      userId: context.userId,
      actorLabel: context.fullName,
      action: "patient_created",
      description: `Patient ${body.name} created`,
      metadata: { stage: body.stage ?? "New Lead" },
    });

    await createNotification({
      clinicId: context.clinicId,
      userId: context.userId,
      patientId: data.id,
      type: "doctor_review_requested",
      title: "Patient created",
      message: `${body.name} entered pipeline and awaits workflow progression.`,
    });

    return successResponse({ patientId: data.id });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 400);
  }
}
