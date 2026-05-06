import { getSessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/validation/api";

export async function GET() {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, message, type, patient_id, read_at, created_at")
    .eq("clinic_id", context.clinicId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return errorResponse(error.message, 500);
  return successResponse({
    notifications: (data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type,
      patientId: item.patient_id,
      readAt: item.read_at,
      createdAt: item.created_at,
    })),
  });
}
