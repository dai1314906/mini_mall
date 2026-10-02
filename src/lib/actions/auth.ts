"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/constants";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { sanitizeNextPath } from "@/lib/core/safe-redirect";

export interface AuthActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** 建立 DB session 行并种 cookie */
async function createSessionCookie(user: { id: number; role: string }): Promise<void> {
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

export async function register(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "该邮箱已被注册" };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role: "USER" },
  });
  await createSessionCookie(user);
  redirect("/");
}

export async function login(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, error: "邮箱或密码错误" };
  }
  await createSessionCookie(user);

  const next = typeof formData.get("next") === "string" ? (formData.get("next") as string) : "/";
  // 防开放重定向：只允许站内路径（含反斜杠/编码绕过拒绝）
  redirect(sanitizeNextPath(next));
}

export async function logout(): Promise<void> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) await prisma.session.deleteMany({ where: { id: payload.sid } });
  }
  (await cookies()).delete(COOKIE_NAME);
  redirect("/");
}
