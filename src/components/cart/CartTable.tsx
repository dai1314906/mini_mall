"use client";

import Link from "next/link";
import { useActionState } from "react";
import { removeFromCart, updateCartQuantity, type CartActionState } from "@/lib/actions/cart";
import { formatCents } from "@/lib/core/money";

export interface CartRowData {
  productId: number;
  name: string;
  price: number;
  stock: number;
  image: string | null;
  quantity: number;
}

const initial: CartActionState = { ok: false };

export default function CartTable({ items }: { items: CartRowData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">商品</th>
            <th>单价</th>
            <th>数量</th>
            <th className="text-right">小计</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <CartRow key={item.productId} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CartRow({ item }: { item: CartRowData }) {
  const [state, action, pending] = useActionState(updateCartQuantity, initial);

  return (
    <tr className="border-b border-gray-100">
      <td className="py-3">
        <div className="flex items-center gap-3">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt="" className="h-14 w-14 rounded border object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded border bg-gray-100 text-gray-400">
              {item.name.slice(0, 1)}
            </div>
          )}
          <Link href={`/products/${item.productId}`} className="hover:text-blue-600">
            {item.name}
          </Link>
        </div>
      </td>
      <td>{formatCents(item.price)}</td>
      <td>
        <div className="flex items-center gap-1">
          <form action={action}>
            <input type="hidden" name="productId" value={item.productId} />
            <input type="hidden" name="quantity" value={item.quantity - 1} />
            <button
              type="submit"
              disabled={pending || item.quantity <= 1}
              className="h-7 w-7 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
            >
              −
            </button>
          </form>
          <span className="w-8 text-center">{item.quantity}</span>
          <form action={action}>
            <input type="hidden" name="productId" value={item.productId} />
            <input type="hidden" name="quantity" value={item.quantity + 1} />
            <button
              type="submit"
              disabled={pending}
              className="h-7 w-7 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
            >
              +
            </button>
          </form>
          <form action={removeFromCart} className="ml-2">
            <input type="hidden" name="productId" value={item.productId} />
            <button type="submit" className="text-xs text-red-600 hover:underline">
              删除
            </button>
          </form>
        </div>
        {state.message && <p className="mt-1 text-xs text-amber-600">{state.message}</p>}
        {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      </td>
      <td className="text-right font-medium">{formatCents(item.price * item.quantity)}</td>
    </tr>
  );
}
