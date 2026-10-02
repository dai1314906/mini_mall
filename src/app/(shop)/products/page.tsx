import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import Pagination from "@/components/ui/Pagination";
import { listCategories } from "@/lib/queries/categories";
import { listProducts } from "@/lib/queries/products";

export const metadata = { title: "全部商品" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const categoryId = Number(sp.category) || undefined;
  const q = sp.q ?? "";

  const [result, categories] = await Promise.all([
    listProducts({ page, categoryId, q }),
    listCategories(),
  ]);

  const tabHref = (catId?: number) =>
    `/products?${catId ? `category=${catId}` : ""}${q ? `${catId ? "&" : ""}q=${encodeURIComponent(q)}` : ""}`;

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm ${active ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-400"}`;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">全部商品</h1>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={tabHref()} className={tabClass(!categoryId)}>
          全部
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={tabHref(c.id)} className={tabClass(categoryId === c.id)}>
            {c.name}
          </Link>
        ))}
        <form action="/products" method="get" className="ml-auto flex gap-2">
          {categoryId ? <input type="hidden" name="category" value={categoryId} /> : null}
          <input
            name="q"
            defaultValue={q}
            placeholder="搜索商品…"
            className="w-48 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
            搜索
          </button>
        </form>
      </div>

      {result.total > 0 && (
        <p className="mb-3 text-sm text-gray-500">
          共 {result.total} 件商品{q && `，关键词「${q}」`}
        </p>
      )}

      {result.products.length === 0 ? (
        <p className="py-16 text-center text-gray-500">没有找到相关商品</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/products"
        params={{ q: q || undefined, category: sp.category }}
      />
    </div>
  );
}
