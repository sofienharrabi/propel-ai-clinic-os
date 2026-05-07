import { UserRole } from "@/lib/types";

export interface SessionContext {
  userId: string;
  email: string;
  role: UserRole;
  clinicId: string;
  fullName: string;
}

export async function getSessionContext(): Promise<SessionContext> {
  return {
    userId: "demo-user",
    email: "demo@propel.ai",
    role: "admin" as UserRole,
    clinicId: "00000000-0000-0000-0000-000000000001",
    fullName: "Demo User",
  };
}
