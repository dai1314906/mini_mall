import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import Pagination from "@/components/ui/Pagination";
import { buildQueryHref } from "@/lib/core/query-href";
import { listCategories } from "@/lib/queries/categories";
import { listProducts } from "@/lib/queries/products";

interface ProductBrowserProps {
  /** 页面所在路径：首页 "/"、列表页 "/products"（搜索表单与分页链接的 base） */
  basePath: string;
  page: number;
  categorySlug?: string;
  q?: string;
  /** 标题；不传则不渲染 h1（首页欢迎区已有标题） */
  title?: string;
}

/** 前台商品浏览区：搜索框 + 分类标签 + 商品网格 + 分页（首页与 /products 共用） */
export default async function ProductBrowser({
  basePath,
  page,
  categorySlug,
  q,
  title,
}: ProductBrowserProps) {
  const keyword = (q ?? "").trim();
  const [result, categories] = await Promise.all([
    listProducts({ page, categorySlug: categorySlug || undefined, q: keyword }),
    listCategories({ counts: "none" }),
  ]);

  const tabHref = (slug?: string) =>
    buildQueryHref(basePath, { category: slug || undefined, q: keyword || undefined });

  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm ${active ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-400"}`;

  return (
    <div>
      {title ? <h1 className="mb-4 text-xl font-bold">{title}</h1> : null}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href={tabHref()} className={tabClass(!categorySlug)}>
          全部
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={tabHref(c.slug)} className={tabClass(categorySlug === c.slug)}>
            {c.name}
          </Link>
        ))}
        <form action={basePath} method="get" className="ml-auto flex gap-2">
          {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
          <input
            // key 随筛选条件变化：软导航后强制重建，避免 defaultValue 残留旧关键词
            key={`${categorySlug ?? ""}|${keyword}`}
            name="q"
            defaultValue={keyword}
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
          共 {result.total} 件商品{keyword && `，关键词「${keyword}」`}
        </p>
      )}

      {result.products.length === 0 ? (
        result.total > 0 ? (
          <p className="py-16 text-center text-gray-500">
            该页没有商品，
            <Link href={tabHref(categorySlug)} className="text-blue-600 hover:underline">
              回到第一页
            </Link>
          </p>
        ) : (
          <p className="py-16 text-center text-gray-500">没有找到相关商品</p>
        )
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
        basePath={basePath}
        params={{ q: keyword || undefined, category: categorySlug || undefined }}
      />
    </div>
  );
}
