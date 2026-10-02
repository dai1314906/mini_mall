"use client";

import Link from "next/link";
import { deleteProduct, toggleProductActive } from "@/lib/actions/admin/products";
import { formatCents } from "@/lib/core/money";

export interface AdminProductRow {
  id: number;
  name: string;
  price: number;
  stock: number;
  image: string | null;
  isActive: boolean;
  categoryName: string;
}

export default function ProductTable({ products }: { products: AdminProductRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-2">ID</th>
          <th>商品</th>
          <th>分类</th>
          <th>价格</th>
          <th>库存</th>
          <th>状态</th>
          <th className="text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id} className="border-b border-gray-100">
            <td className="py-2">{p.id}</td>
            <td>
              <div className="flex items-center gap-2">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" className="h-10 w-10 rounded border object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded border bg-gray-100 text-gray-400">
                    {p.name.slice(0, 1)}
                  </div>
                )}
                <span className="max-w-52 truncate">{p.name}</span>
              </div>
            </td>
            <td>{p.categoryName}</td>
            <td>{formatCents(p.price)}</td>
            <td>{p.stock}</td>
            <td>
              {p.isActive ? (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">上架中</span>
              ) : (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">已下架</span>
              )}
            </td>
            <td className="text-right">
              <Link href={`/admin/products/${p.id}/edit`} className="mr-3 text-blue-600 hover:underline">
                编辑
              </Link>
              <form
                action={toggleProductActive.bind(null, p.id)}
                className="inline"
              >
                <button type="submit" className="mr-3 text-gray-600 hover:underline">
                  {p.isActive ? "下架" : "上架"}
                </button>
              </form>
              <form
                action={deleteProduct.bind(null, p.id)}
                className="inline"
                onSubmit={(e) => {
                  if (!window.confirm(`确认删除商品「${p.name}」？`)) e.preventDefault();
                }}
              >
                <button type="submit" className="text-red-600 hover:underline">
                  删除
                </button>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
