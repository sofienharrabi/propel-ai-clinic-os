import { UserRole } from "@/lib/types";

export type Permission =
  | "patient:create"
  | "patient:update"
  | "patient:move_stage"
  | "patient:doctor_review"
  | "document:upload"
  | "compliance:validate"
  | "audit:view";

const permissionMap: Record<UserRole, Permission[]> = {
  admin: [
    "patient:create",
    "patient:update",
    "patient:move_stage",
    "patient:doctor_review",
    "document:upload",
    "compliance:validate",
    "audit:view",
  ],
  coordinator: ["patient:create", "patient:update", "patient:move_stage", "audit:view"],
  doctor: ["patient:doctor_review"],
  secretary: ["patient:update", "document:upload"],
  compliance_manager: ["compliance:validate", "audit:view"],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return permissionMap[role].includes(permission);
}
