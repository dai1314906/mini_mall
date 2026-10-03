import type { NextRequest } from "next/server";
import { API_PAGE_SIZE } from "@/lib/constants";
import { listProducts } from "@/lib/queries/products";
import { productListQuerySchema } from "@/lib/validations/api";

/**
 * GET /api/products — 商品列表
 * 查询参数：search（模糊搜索）、category（分类 slug 筛选）、page（分页，每页 9 条）
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  // 空串与缺参统一归一为 undefined，走 schema 默认值；非法值才报 400
  const parsed = productListQuerySchema.safeParse({
    page: sp.get("page") || undefined,
    search: sp.get("search") || undefined,
    category: sp.get("category") || undefined,
  });
  if (!parsed.success) {
    return Response.json(
      { error: "参数不合法：page 需为正整数，search/category 不超过 50 字符" },
      { status: 400 },
    );
  }

  const result = await listProducts({
    page: parsed.data.page,
    categorySlug: parsed.data.category || undefined,
    q: parsed.data.search || undefined,
    pageSize: API_PAGE_SIZE,
  });

  return Response.json({ ...result, pageSize: API_PAGE_SIZE });
}
