"use client";

import { useActionState } from "react";
import { payOrder, type OrderActionState } from "@/lib/actions/order";
import { formatCents } from "@/lib/core/money";

const initial: OrderActionState = { ok: false };

/** 模拟支付面板：PENDING 订单显示「确认支付」 */
export default function PayPanel({ orderId, totalAmount }: { orderId: number; totalAmount: number }) {
  const [state, action, pending] = useActionState(payOrder, initial);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-gray-700">
        订单待支付，应付金额 <span className="font-bold text-red-600">{formatCents(totalAmount)}</span>
      </p>
      <form action={action} className="mt-3">
        <input type="hidden" name="orderId" value={orderId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-red-600 px-6 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "支付中…" : "确认支付"}
        </button>
        {/* 成功提示由页面级 banner 展示（重渲染后本组件会随状态变化卸载） */}
        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
