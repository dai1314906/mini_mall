import Link from "next/link";
import ProductTable from "@/components/admin/ProductTable";
import Pagination from "@/components/ui/Pagination";
import { listCategories } from "@/lib/queries/categories";
import { listAdminProductsPage } from "@/lib/queries/admin";
import { buildQueryHref } from "@/lib/core/query-href";
import { firstParam, parsePage } from "@/lib/core/search-params";
import { categoryIdSchema } from "@/lib/validations/api";

export const metadata = { title: "商品管理" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; categoryId?: string | string[] }>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  // 与 API 同一校验契约：拒绝 0x10/1e2/超范围等写法，非法值按未筛选处理
  const parsedCategory = categoryIdSchema.safeParse(firstParam(sp.categoryId));
  const categoryId = parsedCategory.success ? parsedCategory.data : undefined;

  const [result, categories] = await Promise.all([
    listAdminProductsPage({ page, categoryId }),
    listCategories({ counts: "none" }),
  ]);

  const tabHref = (id?: number) =>
    buildQueryHref("/admin/products", { categoryId: id ? String(id) : undefined });

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm ${active ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-400"}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">商品管理</h1>
        <Link
          href="/admin/products/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          + 新增商品
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={tabHref()} className={tabClass(!categoryId)}>
          全部
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={tabHref(c.id)} className={tabClass(categoryId === c.id)}>
            {c.name}
          </Link>
        ))}
      </div>

      {result.total > 0 && (
        <p className="mb-3 text-sm text-gray-500">共 {result.total} 件商品</p>
      )}

      {result.products.length === 0 ? (
        result.total > 0 ? (
          <p className="py-16 text-center text-gray-500">
            该页没有商品，
            <Link href={tabHref(categoryId)} className="text-blue-600 hover:underline">
              回到第一页
            </Link>
          </p>
        ) : (
          <p className="py-16 text-center text-gray-500">
            {categoryId ? "该分类下没有商品" : "还没有商品，点击右上角新增"}
          </p>
        )
      ) : (
        <ProductTable products={result.products} />
      )}

      <Pagination
        page={Math.min(result.page, result.totalPages)}
        totalPages={result.totalPages}
        basePath="/admin/products"
        params={{ categoryId: categoryId ? String(categoryId) : undefined }}
      />
    </div>
  );
}
