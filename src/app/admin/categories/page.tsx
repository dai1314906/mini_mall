import CategoryManager from "@/components/admin/CategoryManager";
import { listCategories } from "@/lib/queries/categories";

export default async function AdminCategoriesPage() {
  const categories = await listCategories();

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">分类管理</h1>
      <CategoryManager
        categories={categories.map((c) => ({ id: c.id, name: c.name, productCount: c._count.products }))}
      />
    </div>
  );
}
