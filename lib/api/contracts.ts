import { z } from "zod";

export const apiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    ok: z.literal(true),
    data,
  });

export type ApiError = z.infer<typeof apiErrorSchema>;
