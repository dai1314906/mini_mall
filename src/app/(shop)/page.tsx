import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import { listLatestProducts } from "@/lib/queries/products";

export default async function HomePage() {
  const products = await listLatestProducts(8);

  return (
    <div>
      <section className="py-10 text-center">
        <h1 className="text-3xl font-bold">欢迎来到 MiniMall</h1>
        <p className="mt-3 text-gray-600">微型电商演示项目 · 心悦会员等级购物享折扣</p>
      </section>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">最新上架</h2>
          <Link href="/products" className="text-sm text-blue-600 hover:underline">
            查看全部 →
          </Link>
        </div>
        {products.length === 0 ? (
          <p className="py-16 text-center text-gray-500">暂无商品</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
