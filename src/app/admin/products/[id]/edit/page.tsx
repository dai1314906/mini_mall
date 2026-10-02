import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";
import { listCategories } from "@/lib/queries/categories";
import { getAdminProduct } from "@/lib/queries/admin";

export const metadata = { title: "编辑商品" };

export default async function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getAdminProduct(Number(id)), listCategories()]);
  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">编辑商品</h1>
      <ProductForm
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          stock: product.stock,
          categoryId: product.categoryId,
          image: product.image,
        }}
      />
    </div>
  );
}
