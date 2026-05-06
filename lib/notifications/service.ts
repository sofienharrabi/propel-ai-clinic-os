import { createClient } from "@/lib/supabase/server";

export async function createNotification(input: {
  clinicId: string;
  userId: string | null;
  patientId?: string | null;
  type:
    | "missing_documents"
    | "doctor_review_requested"
    | "doctor_review_overdue"
    | "sync_failed"
    | "ready_for_official_workflow";
  title: string;
  message: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("notifications").insert({
    clinic_id: input.clinicId,
    user_id: input.userId,
    patient_id: input.patientId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
  });
  if (error) throw error;
}
