import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiUser } from "@/lib/auth/api-guard";
import { getOrderDetailForUser } from "@/lib/queries/orders";
import { payOrderService } from "@/lib/services/order-service";
import { orderIdSchema } from "@/lib/validations/api";

/** GET /api/orders/[id] — 订单详情（归属过滤，非本人 404） */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiUser();
  if ("response" in g) return g.response;

  const { id } = await params;
  const parsed = orderIdSchema.safeParse(id);
  if (!parsed.success) return Response.json({ error: "无效的订单 ID" }, { status: 400 });

  const order = await getOrderDetailForUser(parsed.data, g.user.id);
  if (!order) return Response.json({ error: "订单不存在" }, { status: 404 });
  return Response.json(order);
}

/** PUT /api/orders/[id] — 模拟支付（PENDING → PAID） */
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiUser();
  if ("response" in g) return g.response;

  const { id } = await params;
  const parsed = orderIdSchema.safeParse(id);
  if (!parsed.success) return Response.json({ error: "无效的订单 ID" }, { status: 400 });

  const result = await payOrderService(g.user.id, parsed.data);
  if (!result.ok) {
    const status = result.reason === "NOT_FOUND" ? 404 : 409;
    return Response.json({ error: result.error }, { status });
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${parsed.data}`);
  revalidatePath("/checkout");
  return Response.json({ status: result.status, upgradedLevel: result.upgradedLevel });
}
