import { requireApiUser } from "@/lib/auth/api-guard";

/** GET /api/auth/me — 当前用户 */
export async function GET() {
  const g = await requireApiUser();
  if ("response" in g) return g.response;
  return Response.json(g.user);
}
