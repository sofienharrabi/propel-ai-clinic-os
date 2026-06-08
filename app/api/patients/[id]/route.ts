import { assertPermission, createAuditEvent } from "@/lib/api-utils";
import { getSessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { computeCompliance } from "@/lib/compliance";
import { createNotification } from "@/lib/notifications/service";
import { toPatient } from "@/lib/patient-mappers";
import { errorResponse, parseJson, successResponse } from "@/lib/validation/api";
import { doctorReviewSchema, patientUpdateSchema } from "@/lib/validation/schemas";

const PATIENT_SELECT =
  "*, patient_documents(id, document_type, file_path, status, verified, uploaded_at)";

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
      body.name ||
      body.nationality ||
      body.treatmentType ||
      body.timelineStatus ||
      body.coordinatorName ||
      body.phone ||
      body.email ||
      typeof body.estimatedRevenue === "number" ||
      typeof body.notes === "string" ||
      body.passportNumber !== undefined ||
      body.arrivalDate !== undefined ||
      body.departureDate !== undefined ||
      body.emergencyContact !== undefined ||
      body.treatmentOutcome !== undefined ||
      body.paymentStatus !== undefined ||
      body.followupScheduled !== undefined
    ) {
      assertPermission(context, "patient:update");
      if (body.name) updates.name = body.name;
      if (body.nationality) updates.nationality = body.nationality;
      if (body.treatmentType) updates.treatment_type = body.treatmentType;
      if (body.timelineStatus) updates.timeline_status = body.timelineStatus;
      if (body.coordinatorName) updates.coordinator_name = body.coordinatorName;
      if (body.phone) updates.phone = body.phone;
      if (body.email) updates.email = body.email;
      if (typeof body.estimatedRevenue === "number") updates.revenue_estimate = body.estimatedRevenue;
      if (typeof body.notes === "string") updates.notes = body.notes;
      if (body.passportNumber !== undefined) updates.passport_number = body.passportNumber;
      if (body.arrivalDate !== undefined) updates.arrival_date = body.arrivalDate || null;
      if (body.departureDate !== undefined) updates.departure_date = body.departureDate || null;
      if (body.emergencyContact !== undefined) updates.emergency_contact = body.emergencyContact;
      if (body.treatmentOutcome !== undefined) updates.treatment_outcome = body.treatmentOutcome;
      if (body.paymentStatus !== undefined) updates.payment_status = body.paymentStatus;
      if (body.followupScheduled !== undefined) updates.followup_scheduled = body.followupScheduled;
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

    if (typeof body.archived === "boolean") {
      assertPermission(context, "patient:update");
      if (body.archived) {
        const supabase = await createClient();
        const { data: current } = await supabase
          .from("patients")
          .select("stage")
          .eq("id", id)
          .eq("clinic_id", context.clinicId)
          .single();
        updates.archived = true;
        updates.archived_at = new Date().toISOString();
        updates.archived_by = context.fullName;
        updates.stage_before_archive = current?.stage ?? null;
      } else {
        const supabase = await createClient();
        const { data: current } = await supabase
          .from("patients")
          .select("stage_before_archive")
          .eq("id", id)
          .eq("clinic_id", context.clinicId)
          .single();
        updates.archived = false;
        updates.archived_at = null;
        updates.archived_by = null;
        if (current?.stage_before_archive) {
          updates.stage = current.stage_before_archive;
        }
        updates.stage_before_archive = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse("No updates provided", 400);
    }

    updates.updated_at = new Date().toISOString();

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

    if (typeof body.archived === "boolean") {
      await createAuditEvent({
        clinicId: context.clinicId,
        patientId: id,
        userId: context.userId,
        actorLabel: context.fullName,
        action: body.archived ? "patient_archived" : "patient_restored",
        description: body.archived ? "Patient archived" : "Patient restored to active workflow",
        metadata: {},
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
        .select(PATIENT_SELECT)
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
            updated_at: new Date().toISOString(),
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);
  const { id } = await params;

  try {
    assertPermission(context, "patient:update");

    const supabase = await createClient();
    const { data: patient } = await supabase
      .from("patients")
      .select("name")
      .eq("id", id)
      .eq("clinic_id", context.clinicId)
      .single();

    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", id)
      .eq("clinic_id", context.clinicId);

    if (error) throw new Error(error.message);

    if (patient) {
      await createAuditEvent({
        clinicId: context.clinicId,
        patientId: id,
        userId: context.userId,
        actorLabel: context.fullName,
        action: "patient_deleted",
        description: `Patient ${patient.name} permanently deleted`,
        metadata: {},
      });
    }

    return successResponse({ id });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 400);
  }
}
