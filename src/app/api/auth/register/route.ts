import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validations/auth";
import { readJsonBody } from "@/lib/api/request";

/** POST /api/auth/register — 注册并建立会话 */
export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = registerSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json(
      { error: "参数不合法", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return Response.json({ error: "该邮箱已被注册" }, { status: 409 });

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role: "USER" },
    });
    await setSession(user);
    return Response.json(
      { id: user.id, email: user.email, name: user.name, role: user.role, memberLevel: user.memberLevel, totalSpentCents: user.totalSpentCents },
      { status: 201 },
    );
  } catch (e) {
    // 并发竞态下唯一索引兜底
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return Response.json({ error: "该邮箱已被注册" }, { status: 409 });
    }
    throw e;
  }
}
