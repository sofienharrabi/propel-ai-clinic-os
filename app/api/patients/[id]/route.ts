import { assertPermission, createAuditEvent } from "@/lib/api-utils";
import { getSessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { computeCompliance } from "@/lib/compliance";
import { createNotification } from "@/lib/notifications/service";
import { toPatient } from "@/lib/patient-mappers";
import { errorResponse, parseJson, successResponse } from "@/lib/validation/api";
import { doctorReviewSchema, patientUpdateSchema } from "@/lib/validation/schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);
  const { id } = await params;

  try {
    const parsed = await parseJson(request, patientUpdateSchema);
    if (!parsed.ok) return errorResponse(parsed.error, 400, parsed.details);
    const body = parsed.data;
    const updates: Record<string, unknown> = {};

    if (body.stage) {
      assertPermission(context, "patient:move_stage");
      updates.stage = body.stage;
    }
    if (
      body.treatmentType ||
      body.timelineStatus ||
      body.coordinatorName ||
      body.name ||
      body.phone ||
      body.email ||
      typeof body.estimatedRevenue === "number" ||
      typeof body.notes === "string"
    ) {
      assertPermission(context, "patient:update");
      if (body.treatmentType) updates.treatment_type = body.treatmentType;
      if (body.timelineStatus) updates.timeline_status = body.timelineStatus;
      if (body.coordinatorName) updates.coordinator_name = body.coordinatorName;
      if (body.name) updates.name = body.name;
      if (body.phone) updates.phone = body.phone;
      if (body.email) updates.email = body.email;
      if (typeof body.estimatedRevenue === "number") updates.revenue_estimate = body.estimatedRevenue;
      if (typeof body.notes === "string") updates.notes = body.notes;
    }
    if (body.doctorReviewStatus) {
      const doctorParsed = doctorReviewSchema.safeParse({
        doctorReviewStatus: body.doctorReviewStatus,
        doctorNote: body.doctorNote,
      });
      if (!doctorParsed.success) return errorResponse("Invalid doctor review payload", 400);
      assertPermission(context, "patient:doctor_review");
      updates.doctor_review_status = body.doctorReviewStatus;
      updates.doctor_note = body.doctorNote ?? null;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse("No updates provided", 400);
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("patients")
      .update(updates)
      .eq("id", id)
      .eq("clinic_id", context.clinicId);

    if (error) throw new Error(error.message);

    if (body.stage) {
      await createAuditEvent({
        clinicId: context.clinicId,
        patientId: id,
        userId: context.userId,
        actorLabel: context.fullName,
        action: "stage_moved",
        description: `Patient moved to ${body.stage}`,
        metadata: { stage: body.stage },
      });
    }

    if (body.doctorReviewStatus) {
      await createAuditEvent({
        clinicId: context.clinicId,
        patientId: id,
        userId: context.userId,
        actorLabel: context.fullName,
        action:
          body.doctorReviewStatus === "approved"
            ? "doctor_approved"
            : body.doctorReviewStatus === "rejected"
              ? "doctor_rejected"
              : "doctor_review_requested",
        description: `Doctor review set to ${body.doctorReviewStatus}`,
        metadata: { doctorReviewStatus: body.doctorReviewStatus },
      });
      await createNotification({
        clinicId: context.clinicId,
        userId: context.userId,
        patientId: id,
        type: "doctor_review_requested",
        title: "Doctor review updated",
        message: `Doctor review set to ${body.doctorReviewStatus}.`,
      });

      const { data: patientRow } = await supabase
        .from("patients")
        .select(
          "id, clinic_id, name, phone, email, nationality, treatment_type, stage, risk_score, compliance_score, readiness_status, revenue_estimate, coordinator_name, notes, doctor_note, timeline_status, ai_insights, booking_probability, doctor_review_status, sync_ready, updated_at, patient_documents(id, document_type, file_path, status, verified, uploaded_at)",
        )
        .eq("id", id)
        .eq("clinic_id", context.clinicId)
        .single();
      if (patientRow) {
        const compliance = computeCompliance(toPatient(patientRow));
        await supabase
          .from("patients")
          .update({
            compliance_score: compliance.complianceScore,
            readiness_status: compliance.readinessStatus,
            sync_ready: compliance.readinessStatus === "ready",
          })
          .eq("id", id)
          .eq("clinic_id", context.clinicId);
        if (body.doctorReviewStatus === "pending") {
          await createNotification({
            clinicId: context.clinicId,
            userId: context.userId,
            patientId: id,
            type: "doctor_review_overdue",
            title: "Doctor review pending",
            message: "Doctor review is pending and requires follow-up.",
          });
        }
      }
    }

    return successResponse({ id });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 400);
  }
}
