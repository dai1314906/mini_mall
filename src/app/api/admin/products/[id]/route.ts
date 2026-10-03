import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/request";
import { getAdminProduct } from "@/lib/queries/admin";
import { yuanToCents } from "@/lib/core/money";
import { apiAdminProductSchema, productIdSchema } from "@/lib/validations/api";

/** PUT /api/admin/products/[id] — 更新商品 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiAdmin();
  if ("response" in g) return g.response;

  const { id } = await params;
  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) return Response.json({ error: "无效的商品 ID" }, { status: 400 });

  const existing = await getAdminProduct(parsedId.data);
  if (!existing) return Response.json({ error: "商品不存在" }, { status: 404 });

  const body = await readJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = apiAdminProductSchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json(
      { error: "参数不合法", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;
  // 部分更新语义：未传的 description/image 保留原值（传空串/空图则显式清空）
  const bodyData = body.data as Record<string, unknown>;
  const description = "description" in bodyData ? d.description : existing.description ?? "";
  const image = "image" in bodyData ? d.image || null : existing.image;

  try {
    const product = await prisma.product.update({
      where: { id: parsedId.data },
      data: {
        name: d.name,
        description,
        price: yuanToCents(d.price),
        stock: d.stock,
        categoryId: d.categoryId,
        image,
      },
    });
    revalidatePath("/products");
    revalidatePath("/admin/products");
    return Response.json(product);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "商品不存在" }, { status: 404 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return Response.json({ error: "分类不存在" }, { status: 400 });
    }
    throw e;
  }
}

/** DELETE /api/admin/products/[id] — 删除商品（OrderItem SetNull、CartItem Cascade 兜底历史数据） */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiAdmin();
  if ("response" in g) return g.response;

  const { id } = await params;
  const parsedId = productIdSchema.safeParse(id);
  if (!parsedId.success) return Response.json({ error: "无效的商品 ID" }, { status: 400 });

  try {
    await prisma.product.delete({ where: { id: parsedId.data } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return Response.json({ error: "商品不存在" }, { status: 404 });
    }
    throw e;
  }
  revalidatePath("/products");
  revalidatePath("/admin/products");
  return new Response(null, { status: 204 });
}
