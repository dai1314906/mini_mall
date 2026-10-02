import Link from "next/link";
import ProductTable from "@/components/admin/ProductTable";
import { listAdminProducts } from "@/lib/queries/admin";

export const metadata = { title: "商品管理" };

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

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
      {products.length === 0 ? (
        <p className="py-16 text-center text-gray-500">还没有商品，点击右上角新增</p>
      ) : (
        <ProductTable products={products} />
      )}
    </div>
  );
}
