import ProductBrowser from "@/components/product/ProductBrowser";
import { firstParam, parsePage } from "@/lib/core/search-params";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    category?: string | string[];
    q?: string | string[];
  }>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const category = firstParam(sp.category);
  const q = firstParam(sp.q);

  return (
    <div>
      <section className="py-8 text-center">
        <h1 className="text-3xl font-bold">欢迎来到 MiniMall</h1>
        <p className="mt-3 text-gray-600">微型电商演示项目 · 心悦会员等级购物享折扣</p>
      </section>
      <ProductBrowser basePath="/" page={page} categorySlug={category} q={q} />
    </div>
  );
}
