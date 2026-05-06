import { getAnalyticsOverview } from "@/lib/analytics/overview";
import { assertPermission } from "@/lib/api-utils";
import { getSessionContext } from "@/lib/server-auth";
import { errorResponse, successResponse } from "@/lib/validation/api";

export async function GET() {
  const context = await getSessionContext();
  if (!context) return errorResponse("Unauthorized", 401);

  try {
    assertPermission(context, "audit:view");
    const overview = await getAnalyticsOverview(context.clinicId);
    return successResponse(overview);
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Unexpected error", 400);
  }
}
