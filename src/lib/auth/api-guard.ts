import "server-only";

import { canAccess } from "@/lib/core/guards";
import { getSession, type SessionUser } from "@/lib/auth/session";

/**
 * API 路由守卫（勿复用 requireUser/requireAdmin——它们的 redirect 在 route handler 里抛
 * NEXT_REDIRECT，行为错误）。用法：每个 handler 首行
 *   const g = await requireApiUser(); if ("response" in g) return g.response;
 */
export type ApiGuard = { user: SessionUser } | { response: Response };

/** 登录守卫：未登录 → 401 */
export async function requireApiUser(): Promise<ApiGuard> {
  const user = await getSession();
  if (!user) return { response: Response.json({ error: "请先登录" }, { status: 401 }) };
  return { user };
}

/** 管理员守卫：未登录 → 401，非 ADMIN → 403 */
export async function requireApiAdmin(): Promise<ApiGuard> {
  const user = await getSession();
  if (!user) return { response: Response.json({ error: "请先登录" }, { status: 401 }) };
  if (!canAccess(user.role, "ADMIN")) {
    return { response: Response.json({ error: "无权限访问" }, { status: 403 }) };
  }
  return { user };
}
