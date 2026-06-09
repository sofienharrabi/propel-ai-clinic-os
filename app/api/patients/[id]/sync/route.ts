import { assertPermission, createAuditEvent } from "@/lib/api-utils";
import { computeCompliance } from "@/lib/compliance";
import { createNotification } from "@/lib/notifications/service";
import { toPatient } from "@/lib/patient-mappers";
import { getSessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import type { Patient } from "@/lib/types";
import { errorResponse, successResponse } from "@/lib/validation/api";
import { syncReadinessSchema } from "@/lib/validation/schemas";

function riskLevel(score: number) {
  if (score >= 85) return "low";
  if (score >= 50) return "medium";
  return "high";
}

// Calls Claude Haiku to generate a 2-sentence readiness assessment.
// Returns null if ANTHROPIC_API_KEY is not configured or the call fails —
// the route falls back to the basic computeCompliance result in that case.
async function generateAiInsights(
  patient: Patient,
  compliance: { complianceScore: number; readinessStatus: string; missingItems: string[] },
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: `You are a medical tourism compliance officer. Write a concise 2-sentence readiness assessment for this patient file.

Patient: ${patient.name}, ${patient.nationality}
Treatment: ${patient.treatmentType}
Compliance score: ${compliance.complianceScore}%
Status: ${compliance.readinessStatus}
Missing items: ${compliance.missingItems.length === 0 ? "none" : compliance.missingItems.join(", ")}
Doctor review: ${patient.doctorReviewStatus}

Reply with exactly 2 sentences. No lists, no headers.`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { content?: { type: string; text: string }[] };
    return json.content?.find((c) => c.type === "text")?.text ?? null;
  } catch {
    return null;
  }
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

    // AI insight is optional — null when key is absent or call fails
    const aiInsights = await generateAiInsights(patient, compliance);

    const { error: updateError } = await supabase
      .from("patients")
      .update({
        compliance_score: compliance.complianceScore,
        readiness_status: compliance.readinessStatus,
        sync_ready: ready,
        ...(aiInsights ? { ai_insights: aiInsights } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("clinic_id", context.clinicId);

    if (updateError) throw new Error(updateError.message);

    const successMessage =
      "Patient file validated and prepared for official workflow. Ready for HealthTürkiye/USHAŞ manual submission.";
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
      title: ready
        ? "Patient ready for official workflow preparation"
        : "Sync readiness failed",
      message: ready ? successMessage : failMessage,
    });

    return successResponse({
      ok: ready,
      message: ready ? successMessage : failMessage,
      compliance,
      riskLevel: riskLevel(compliance.complianceScore),
      recommendedActions:
        compliance.missingItems.length === 0
          ? [
              "Continue coordinator follow-up",
              "Proceed with manual official submission preparation",
            ]
          : compliance.missingItems.map((item) => `Resolve: ${item}`),
    });
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : (error as { message?: string })?.message ?? "Unexpected error";
    return errorResponse(msg, 400);
  }
}
