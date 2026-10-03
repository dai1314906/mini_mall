import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/request";
import { adminTransitionOrder } from "@/lib/services/order-service";
import { adminOrderTransitionSchema, orderIdSchema } from "@/lib/validations/api";

/** PUT /api/admin/orders/[id] — 更新订单状态（发货 / 退款取消 / 确认收货） */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiAdmin();
  if ("response" in g) return g.response;

  const { id } = await params;
  const parsedId = orderIdSchema.safeParse(id);
  if (!parsedId.success) return Response.json({ error: "无效的订单 ID" }, { status: 400 });

  const body = await readJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = adminOrderTransitionSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json(
      { error: "参数不合法：status 仅支持 SHIPPED / CANCELLED / COMPLETED", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const result = await adminTransitionOrder(parsedId.data, parsed.data.status);
  if (!result.ok) {
    const status = result.reason === "NOT_FOUND" ? 404 : 409;
    return Response.json({ error: result.error }, { status });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsedId.data}`);
  return Response.json({ status: result.status });
}
