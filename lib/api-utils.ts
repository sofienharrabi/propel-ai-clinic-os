import { hasPermission, Permission } from "@/lib/rbac";
import { SessionContext } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { AuditEvent } from "@/lib/types";

export function assertPermission(context: SessionContext, permission: Permission) {
  if (!hasPermission(context.role, permission)) {
    throw new Error("Forbidden");
  }
}

export async function createAuditEvent(input: {
  clinicId: string;
  patientId: string;
  userId: string | null;
  actorLabel: string;
  action: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("audit_events").insert({
    clinic_id: input.clinicId,
    patient_id: input.patientId,
    user_id: input.userId,
    actor_label: input.actorLabel,
    action: input.action,
    description: input.description,
    metadata: input.metadata ?? {},
  });

  if (error) throw error;
}

export function normalizeAuditEvent(row: {
  id: string;
  patient_id: string;
  user_id: string | null;
  actor_label: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}): AuditEvent {
  return {
    id: row.id,
    patientId: row.patient_id,
    userId: row.user_id,
    actor: row.actor_label,
    action: row.action,
    description: row.description,
    metadata: row.metadata ?? {},
    timestamp: row.created_at,
  };
}
