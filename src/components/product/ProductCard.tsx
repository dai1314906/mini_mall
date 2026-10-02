import Link from "next/link";
import { formatCents } from "@/lib/core/money";

export interface ProductCardData {
  id: number;
  name: string;
  price: number;
  stock: number;
  image: string | null;
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.id}`}
      className="group overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="flex h-44 items-center justify-center overflow-hidden bg-gray-100">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
        ) : (
          <span className="text-3xl text-gray-300">{product.name.slice(0, 1)}</span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-medium group-hover:text-blue-600">{product.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-semibold text-red-600">{formatCents(product.price)}</span>
          {product.stock > 0 ? (
            <span className="text-xs text-gray-400">库存 {product.stock}</span>
          ) : (
            <span className="text-xs text-gray-400">已售罄</span>
          )}
        </div>
      </div>
    </Link>
  );
}
