import { assertPermission, normalizeAuditEvent } from "@/lib/api-utils";
import { getSessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/validation/api";

export async function GET() {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);

  try {
    assertPermission(context, "audit:view");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audit_events")
      .select("id, patient_id, user_id, actor_label, action, description, metadata, created_at")
      .eq("clinic_id", context.clinicId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return successResponse({ auditEvents: (data ?? []).map(normalizeAuditEvent) });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 400);
  }
}
