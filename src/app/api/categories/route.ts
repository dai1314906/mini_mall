import { listCategories } from "@/lib/queries/categories";

/** GET /api/categories — 分类列表（商品数只统计上架商品） */
export async function GET() {
  const categories = await listCategories({ counts: "active" });
  return Response.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: c._count.products,
    })),
  );
}
