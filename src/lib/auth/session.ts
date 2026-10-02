import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { COOKIE_NAME } from "@/lib/constants";
import { verifySessionToken } from "@/lib/auth/jwt";
import { canAccess } from "@/lib/core/guards";
import type { Role } from "@/lib/core/guards";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  memberLevel: string;
  totalSpentCents: number;
}

/**
 * 读取当前登录用户。React cache 保证同一渲染周期内多次调用只查一次库。
 * 权威判定以数据库 session 行为准（可撤销），JWT 仅作快速验签。
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true, memberLevel: true, totalSpentCents: true },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return { ...session.user, role: session.user.role as Role };
});

/** 登录守卫：未登录跳登录页（nextPath 由调用方页面传入自身路径） */
export async function requireUser(nextPath = "/"): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/** 管理员守卫：未登录跳登录，非管理员跳首页 */
export async function requireAdmin(nextPath = "/admin"): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (!canAccess(user.role, "ADMIN")) {
    redirect("/");
  }
  return user;
}
