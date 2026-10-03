import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/request";
import { removeCartItem, updateCartItem } from "@/lib/services/cart-service";
import { cartItemIdSchema, quantitySchema } from "@/lib/validations/api";

async function parseItemId(params: Promise<{ id: string }>): Promise<number | Response> {
  const { id } = await params;
  const parsed = cartItemIdSchema.safeParse(id);
  if (!parsed.success) return Response.json({ error: "无效的购物车项 ID" }, { status: 400 });
  return parsed.data;
}

/** PUT /api/cart/[id] — 修改数量（超库存报错） */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiUser();
  if ("response" in g) return g.response;

  const itemId = await parseItemId(params);
  if (itemId instanceof Response) return itemId;

  const body = await readJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = quantitySchema.safeParse((body.data as { quantity?: unknown })?.quantity);
  if (!parsed.success) {
    return Response.json(
      { error: "参数不合法", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const result = await updateCartItem(g.user.id, itemId, parsed.data);
  if (!result.ok) {
    const status = result.reason === "NOT_FOUND" ? 404 : 409;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ itemId: result.itemId, quantity: result.quantity });
}

/** DELETE /api/cart/[id] — 删除某项（归属校验） */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiUser();
  if ("response" in g) return g.response;

  const itemId = await parseItemId(params);
  if (itemId instanceof Response) return itemId;

  const result = await removeCartItem(g.user.id, itemId);
  if (!result.ok) return Response.json({ error: result.error }, { status: 404 });
  return new Response(null, { status: 204 });
}
