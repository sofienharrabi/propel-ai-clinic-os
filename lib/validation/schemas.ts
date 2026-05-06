import { z } from "zod";

export const patientCreateSchema = z.object({
  name: z.string().min(2),
  nationality: z.string().min(2),
  phone: z.string().min(5).max(30).optional(),
  email: z.string().email().optional(),
  treatmentType: z.string().min(2),
  estimatedRevenue: z.number().min(0).optional(),
  assignedCoordinator: z.string().min(2).optional(),
  notes: z.string().max(2000).optional(),
  stage: z.string().optional(),
});

export const patientUpdateSchema = z
  .object({
    stage: z.string().optional(),
    name: z.string().min(2).optional(),
    phone: z.string().min(5).max(30).optional(),
    email: z.string().email().optional(),
    treatmentType: z.string().min(2).optional(),
    estimatedRevenue: z.number().min(0).optional(),
    timelineStatus: z.string().max(300).optional(),
    coordinatorName: z.string().min(2).optional(),
    notes: z.string().max(2000).optional(),
    doctorReviewStatus: z.enum(["pending", "approved", "rejected"]).optional(),
    doctorNote: z.string().max(2000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No updates provided");

export const documentUploadSchema = z.object({
  documentType: z.enum([
    "passport",
    "consent_form",
    "medical_report",
    "treatment_image",
    "payment_confirmation",
    "translation",
    "invoice",
  ]),
});

export const doctorReviewSchema = z.object({
  doctorReviewStatus: z.enum(["pending", "approved", "rejected"]),
  doctorNote: z.string().max(2000).optional(),
});

export const syncReadinessSchema = z.object({
  patientId: z.string().uuid().or(z.string().min(1)),
});

export const notificationReadSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
});
