import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/lib/types";

export interface SessionContext {
  userId: string;
  email: string;
  role: UserRole;
  clinicId: string;
  fullName: string;
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, clinic_id, full_name")
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role as UserRole,
    clinicId: profile.clinic_id as string,
    fullName: profile.full_name as string,
  };
}
