import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/request";
import { listOrders } from "@/lib/queries/orders";
import { CheckoutError, createOrderFromCart } from "@/lib/services/order-service";
import { checkoutSchema } from "@/lib/validations/checkout";
import type { MemberLevel } from "@/lib/core/member";

/** POST /api/orders — 从购物车创建订单（事务：建单→扣库存→清购物车） */
export async function POST(request: NextRequest) {
  const g = await requireApiUser();
  if ("response" in g) return g.response;

  const body = await readJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = checkoutSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json(
      { error: "参数不合法", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  try {
    const order = await createOrderFromCart(g.user.id, g.user.memberLevel as MemberLevel, parsed.data);
    revalidatePath("/cart");
    return Response.json(order, { status: 201 });
  } catch (e) {
    if (e instanceof CheckoutError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}

/** GET /api/orders — 我的订单列表 */
export async function GET() {
  const g = await requireApiUser();
  if ("response" in g) return g.response;

  const orders = await listOrders(g.user.id);
  return Response.json(orders);
}
