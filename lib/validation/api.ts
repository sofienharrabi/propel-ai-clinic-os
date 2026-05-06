import { ZodError, ZodSchema } from "zod";

export function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function parseJson<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ ok: true; data: T } | { ok: false; error: string; details?: unknown }> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return { ok: false, error: "Validation error", details: formatZodError(parsed.error) };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}

export function successResponse<T>(data: T) {
  return Response.json({ ok: true, data });
}

export function errorResponse(error: string, status = 400, details?: unknown) {
  return Response.json({ ok: false, error, details }, { status });
}
