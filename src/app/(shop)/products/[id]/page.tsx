import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/product/AddToCartButton";
import { getProductDetail } from "@/lib/queries/products";
import { formatCents } from "@/lib/core/money";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductDetail(Number(id));
  if (!product) notFound();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex h-80 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 md:h-96">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-6xl text-gray-300">{product.name.slice(0, 1)}</span>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-500">
          <Link href={`/products?category=${product.categoryId}`} className="hover:text-blue-600">
            {product.categoryName}
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-bold">{product.name}</h1>
        <p className="mt-4 text-3xl font-bold text-red-600">{formatCents(product.price)}</p>
        <p className="mt-4 whitespace-pre-line text-gray-700">{product.description}</p>
        <p className="mt-4 text-sm text-gray-500">
          {product.stock > 0 ? `库存：${product.stock}` : "已售罄"}
        </p>
        <AddToCartButton productId={product.id} stock={product.stock} next={`/products/${product.id}`} />
      </div>
    </div>
  );
}
