import { getSessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/validation/api";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);
  const { id } = await params;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("clinic_id", context.clinicId);

  if (error) return errorResponse(error.message, 400);
  return successResponse({ id });
}
