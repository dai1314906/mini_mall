import type { NextRequest } from "next/server";
import { requireApiAdmin } from "@/lib/auth/api-guard";
import { listAdminOrders } from "@/lib/queries/admin";
import { orderStatusSchema } from "@/lib/validations/api";

/** GET /api/admin/orders — 所有订单列表（可按 status 筛选） */
export async function GET(request: NextRequest) {
  const g = await requireApiAdmin();
  if ("response" in g) return g.response;

  const statusRaw = request.nextUrl.searchParams.get("status");
  const status = statusRaw || undefined;
  if (status) {
    const parsed = orderStatusSchema.safeParse(status);
    if (!parsed.success) return Response.json({ error: "无效的订单状态" }, { status: 400 });
    return Response.json(await listAdminOrders(parsed.data));
  }

  return Response.json(await listAdminOrders());
}
