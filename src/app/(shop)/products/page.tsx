import ProductBrowser from "@/components/product/ProductBrowser";
import { firstParam, parsePage } from "@/lib/core/search-params";

export const metadata = { title: "全部商品" };

export default async function ProductsPage({
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
    <ProductBrowser basePath="/products" page={page} categorySlug={category} q={q} title="全部商品" />
  );
}
