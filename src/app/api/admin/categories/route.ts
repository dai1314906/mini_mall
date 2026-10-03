import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/auth/api-guard";
import { readJsonBody } from "@/lib/api/request";
import { listCategories } from "@/lib/queries/categories";
import { createCategoryService } from "@/lib/services/category-service";
import { categorySchema } from "@/lib/validations/product";

/** GET /api/admin/categories — 分类列表（计数含下架商品） */
export async function GET() {
  const g = await requireApiAdmin();
  if ("response" in g) return g.response;

  return Response.json(await listCategories());
}

/** POST /api/admin/categories — 创建分类（自动生成唯一 slug） */
export async function POST(request: NextRequest) {
  const g = await requireApiAdmin();
  if ("response" in g) return g.response;

  const body = await readJsonBody(request);
  if ("error" in body) return body.error;

  const parsed = categorySchema.safeParse(body.data);
  if (!parsed.success) {
    return Response.json(
      { error: "参数不合法", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const result = await createCategoryService(parsed.data.name);
  if (!result.ok) return Response.json({ error: result.error }, { status: 409 });

  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return Response.json(result.data, { status: 201 });
}
