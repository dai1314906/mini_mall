import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validations/auth";
import { readJsonBody } from "@/lib/api/request";

/** POST /api/auth/login — 登录并建立会话；失败统一文案，不暴露用户是否存在 */
export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = loginSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json(
      { error: "参数不合法", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  await setSession(user);
  return Response.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    memberLevel: user.memberLevel,
    totalSpentCents: user.totalSpentCents,
  });
}
