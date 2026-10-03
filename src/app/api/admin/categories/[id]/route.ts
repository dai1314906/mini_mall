import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { requireApiAdmin } from "@/lib/auth/api-guard";
import { deleteCategoryService } from "@/lib/services/category-service";
import { categoryIdSchema } from "@/lib/validations/api";

/** DELETE /api/admin/categories/[id] — 删除分类（有商品时 Restrict 拒绝） */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const g = await requireApiAdmin();
  if ("response" in g) return g.response;

  const { id } = await params;
  const parsed = categoryIdSchema.safeParse(id);
  if (!parsed.success) return Response.json({ error: "无效的分类 ID" }, { status: 400 });

  const result = await deleteCategoryService(parsed.data);
  if (!result.ok) {
    const status = result.reason === "NOT_FOUND" ? 404 : 409;
    return Response.json({ error: result.error }, { status });
  }

  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return new Response(null, { status: 204 });
}
