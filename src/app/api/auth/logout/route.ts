import { clearSession } from "@/lib/auth/session";

/** POST /api/auth/logout — 退出登录（幂等） */
export async function POST() {
  await clearSession();
  return new Response(null, { status: 204 });
}
