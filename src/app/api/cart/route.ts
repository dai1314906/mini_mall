import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/request";
import { getCartItems } from "@/lib/queries/cart";
import { addCartItem } from "@/lib/services/cart-service";
import { cartTotals } from "@/lib/core/cart-math";
import { applyDiscount, discountRateFor, type MemberLevel } from "@/lib/core/member";
import { apiCartAddSchema } from "@/lib/validations/api";

/** GET /api/cart — 当前用户购物车（只含上架商品；totals 带会员折扣口径，与页面/下单一致） */
export async function GET() {
  const g = await requireApiUser();
  if ("response" in g) return g.response;

  const items = await getCartItems(g.user.id);
  const active = items.filter((i) => i.product.isActive);
  const { totalCents, totalQuantity } = cartTotals(
    active.map((i) => ({ unitPrice: i.product.price, quantity: i.quantity })),
  );
  const discountRate = discountRateFor(g.user.memberLevel as MemberLevel);
  return Response.json({
    items: active,
    totals: {
      totalCents,
      totalQuantity,
      memberLevel: g.user.memberLevel,
      discountRate,
      payableCents: applyDiscount(totalCents, discountRate),
    },
  });
}

/** POST /api/cart — 加入购物车（productId + quantity；已有则合并；库存不足报错） */
export async function POST(request: NextRequest) {
  const g = await requireApiUser();
  if ("response" in g) return g.response;

  const body = await readJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = apiCartAddSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json(
      { error: "参数不合法", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const result = await addCartItem(g.user.id, parsed.data.productId, parsed.data.quantity);
  if (!result.ok) {
    const status = result.reason === "NOT_FOUND" ? 404 : 409;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ itemId: result.itemId, quantity: result.quantity });
}
