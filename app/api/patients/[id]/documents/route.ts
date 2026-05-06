import { assertPermission, createAuditEvent } from "@/lib/api-utils";
import { computeCompliance } from "@/lib/compliance";
import { createNotification } from "@/lib/notifications/service";
import { toPatient } from "@/lib/patient-mappers";
import { getSessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { DocumentType } from "@/lib/types";
import { errorResponse, successResponse } from "@/lib/validation/api";
import { documentUploadSchema } from "@/lib/validation/schemas";

const allowedTypes: DocumentType[] = [
  "passport",
  "consent_form",
  "medical_report",
  "treatment_image",
  "payment_confirmation",
  "translation",
  "invoice",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);
  const { id } = await params;

  try {
    assertPermission(context, "document:upload");
    const form = await request.formData();
    const file = form.get("file");
    const parsed = documentUploadSchema.safeParse({
      documentType: String(form.get("documentType") ?? ""),
    });
    if (!parsed.success) return errorResponse("Invalid document type", 400);
    const documentType = parsed.data.documentType as DocumentType;

    if (!(file instanceof File) || !allowedTypes.includes(documentType)) {
      return errorResponse("Invalid file or document type", 400);
    }

    const supabase = await createClient();
    const path = `${context.clinicId}/${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("patient-documents")
      .upload(path, file, { upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: docData, error: docError } = await supabase.from("patient_documents").insert({
      clinic_id: context.clinicId,
      patient_id: id,
      document_type: documentType,
      file_path: path,
      uploaded_by: context.userId,
      status: "uploaded",
    }).select("id, status").single();

    if (docError) throw new Error(docError.message);

    await createAuditEvent({
      clinicId: context.clinicId,
      patientId: id,
      userId: context.userId,
      actorLabel: context.fullName,
      action: "document_uploaded",
      description: `${documentType} uploaded`,
      metadata: { documentType, path },
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
      if (compliance.missingItems.length > 0) {
        await createNotification({
          clinicId: context.clinicId,
          userId: context.userId,
          patientId: id,
          type: "missing_documents",
          title: "Missing documents remain",
          message: `Still missing: ${compliance.missingItems.join(", ")}`,
        });
      }
    }

    return successResponse({ document: docData });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 400);
  }
}
