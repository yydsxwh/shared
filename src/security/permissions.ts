/**
 * 角色仍是 ADMIN / AGENT / MERCHANT / TEACHER / STUDENT。
 * 敏感后台改查权限名，避免只靠前端把按钮藏起来。
 */

export const PERMISSIONS = [
  "user.read",
  "user.manage",
  "role.manage",
  "oauth-client.read",
  "oauth-client.manage",
  "security.read",
  "payment.read",
  "payment.manage",
  "storage.manage",
  "ai.manage",
  "release.manage",
  "academic.student.read",
  "academic.teacher.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  AGENT: ["user.read", "security.read", "payment.read"],
  MERCHANT: ["payment.read", "storage.manage"],
  TEACHER: ["academic.student.read", "academic.teacher.manage"],
  STUDENT: [],
};

export function permissionsForRoles(roles: readonly string[]): Set<Permission> {
  const granted = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) granted.add(permission);
  }
  return granted;
}

export function hasPermission(roles: readonly string[], permission: Permission): boolean {
  if (roles.includes("ADMIN")) return ALL.has(permission);
  return permissionsForRoles(roles).has(permission);
}

export function requirePermission(
  roles: readonly string[],
  permission: Permission,
): { ok: true } | { ok: false; status: 403; error: string } {
  if (hasPermission(roles, permission)) return { ok: true };
  return { ok: false, status: 403, error: "没有权限" };
}
