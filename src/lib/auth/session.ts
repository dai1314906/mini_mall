import "server-only";

import { randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";
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

/** 建立 DB session 行并种 cookie（Server Action 与 API route 共用，不含 redirect） */
export async function setSession(user: { id: number; role: string }): Promise<void> {
  const sid = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { id: sid, userId: user.id, expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000) },
  });
  // 机会式清理该用户过期会话
  await prisma.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
  const token = await signSessionToken({ sid, role: user.role });
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** 清除会话：删 DB session 行 + 删 cookie（幂等，不含 redirect） */
export async function clearSession(): Promise<void> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) await prisma.session.deleteMany({ where: { id: payload.sid } });
  }
  (await cookies()).delete(COOKIE_NAME);
}
