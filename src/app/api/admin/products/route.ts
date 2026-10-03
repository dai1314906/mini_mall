import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiAdmin } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/request";
import { listAdminProducts } from "@/lib/queries/admin";
import { yuanToCents } from "@/lib/core/money";
import { apiAdminProductSchema } from "@/lib/validations/api";

/** GET /api/admin/products — 后台商品列表（含下架） */
export async function GET() {
  const g = await requireApiAdmin();
  if ("response" in g) return g.response;

  return Response.json(await listAdminProducts());
}

/** POST /api/admin/products — 创建商品（price 为元字符串，与站内表单一致） */
export async function POST(request: NextRequest) {
  const g = await requireApiAdmin();
  if ("response" in g) return g.response;

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

  try {
    const product = await prisma.product.create({
      data: {
        name: d.name,
        description: d.description ?? "",
        price: yuanToCents(d.price),
        stock: d.stock,
        categoryId: d.categoryId,
        image: d.image || null,
      },
    });
    revalidatePath("/products");
    revalidatePath("/admin/products");
    return Response.json(product, { status: 201 });
  } catch (e) {
    // 分类不存在（外键）或并发删除
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      return Response.json({ error: "分类不存在" }, { status: 400 });
    }
    throw e;
  }
}
