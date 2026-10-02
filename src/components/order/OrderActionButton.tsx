"use client";

import { useActionState } from "react";

export interface OrderButtonState {
  ok: boolean;
  error?: string;
  message?: string;
}

/** 通用订单操作按钮（取消/确认收货/发货/退款），支持确认弹窗与错误提示 */
export default function OrderActionButton({
  action,
  orderId,
  text,
  confirmText,
  tone = "default",
}: {
  action: (prev: OrderButtonState, formData: FormData) => Promise<OrderButtonState>;
  orderId: number;
  text: string;
  confirmText?: string;
  tone?: "default" | "danger";
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false } as OrderButtonState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
      className="inline-block"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        className={
          tone === "danger"
            ? "rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
            : "rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        }
      >
        {pending ? "处理中…" : text}
      </button>
      {/* 成功提示由页面级 banner 展示 */}
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
