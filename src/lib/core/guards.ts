/** 角色与权限判定（纯函数，零依赖，供 Vitest 直测） */

export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/**
 * 权限判定：ADMIN 满足 USER 与 ADMIN，USER 仅满足 USER。
 * userRole 为 null 表示未登录。
 */
export function canAccess(userRole: Role | null, required: Role): boolean {
  if (required === "USER") return userRole !== null;
  return userRole === "ADMIN";
}
