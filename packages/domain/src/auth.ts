import type { AdminRole, AuthSessionDto } from "../../shared/src/admin-web";

type RawSessionUser = {
  id: number;
  email: string;
  role: string;
  is_super_admin?: boolean;
  name?: string | null;
};

function normalizeRole(role: string): AdminRole {
  if (role === "agent") return "operator";
  if (role === "super_admin" || role === "admin" || role === "operator" || role === "viewer") {
    return role;
  }
  return "viewer";
}

function roleLabel(role: AdminRole) {
  switch (role) {
    case "super_admin":
      return "Super Admin";
    case "admin":
      return "Admin";
    case "operator":
      return "Operador";
    case "viewer":
    default:
      return "Consulta";
  }
}

function buildInitials(displayName: string, email: string) {
  const source = displayName.trim() || email.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] || ""}${parts[1]![0] || ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function toAuthSessionDto(user: RawSessionUser): AuthSessionDto {
  const role = normalizeRole(String(user.role || ""));
  const displayName = String(user.name || user.email).trim();
  const isSuperAdmin = Boolean(user.is_super_admin) || role === "super_admin";

  return {
    id: user.id,
    email: user.email,
    displayName,
    role,
    roleLabel: roleLabel(role),
    initials: buildInitials(displayName, user.email),
    isSuperAdmin,
  };
}
