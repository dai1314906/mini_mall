import ProductForm from "@/components/admin/ProductForm";
import { listCategories } from "@/lib/queries/categories";

export const metadata = { title: "新增商品" };

export default async function AdminProductNewPage() {
  const categories = await listCategories();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">新增商品</h1>
      <ProductForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
