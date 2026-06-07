import { UserRole } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role as UserRole,
    clinicId: profile.clinic_id,
    fullName: profile.full_name,
  };
}
