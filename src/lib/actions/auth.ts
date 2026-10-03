"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { clearSession, setSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { sanitizeNextPath } from "@/lib/core/safe-redirect";

export interface AuthActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
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

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role: "USER" },
    });
    await setSession(user);
  } catch (e) {
    // 并发竞态下唯一索引兜底（与 API register 对齐）
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "该邮箱已被注册" };
    }
    throw e;
  }
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
  await setSession(user);

  const next = typeof formData.get("next") === "string" ? (formData.get("next") as string) : "/";
  // 防开放重定向：只允许站内路径（含反斜杠/编码绕过拒绝）
  redirect(sanitizeNextPath(next));
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}
