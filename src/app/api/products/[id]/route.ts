import type { NextRequest } from "next/server";
import { getProductDetail } from "@/lib/queries/products";
import { productIdSchema } from "@/lib/validations/api";

/** GET /api/products/[id] — 商品详情（含关联分类信息） */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = productIdSchema.safeParse(id);
  if (!parsed.success) {
    return Response.json({ error: "无效的商品 ID" }, { status: 400 });
  }

  const product = await getProductDetail(parsed.data);
  if (!product) {
    return Response.json({ error: "商品不存在" }, { status: 404 });
  }

  return Response.json(product);
}
