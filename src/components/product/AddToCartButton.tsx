"use client";

import { useActionState } from "react";
import { addToCart, type CartActionState } from "@/lib/actions/cart";

const initial: CartActionState = { ok: false };

export default function AddToCartButton({
  productId,
  stock,
  next,
}: {
  productId: number;
  stock: number;
  next: string;
}) {
  const [state, action, pending] = useActionState(addToCart, initial);
  const soldOut = stock < 1;

  return (
    <form action={action} className="mt-6 flex flex-wrap items-center gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="next" value={next} />
      {!soldOut && (
        <select name="quantity" className="rounded border border-gray-300 px-2 py-2">
          {Array.from({ length: Math.min(stock, 10) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      )}
      <button
        type="submit"
        disabled={pending || soldOut}
        className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {soldOut ? "已售罄" : pending ? "加入中…" : "加入购物车"}
      </button>
      {state.message && <span className="text-sm text-amber-600">{state.message}</span>}
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
