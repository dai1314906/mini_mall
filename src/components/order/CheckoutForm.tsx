"use client";

import { useActionState } from "react";
import { checkout, type CheckoutActionState } from "@/lib/actions/checkout";

const initial: CheckoutActionState = { ok: false };

export default function CheckoutForm() {
  const [state, action, pending] = useActionState(checkout, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="receiverName" className="mb-1 block text-sm font-medium">
          收货人
        </label>
        <input
          id="receiverName"
          name="receiverName"
          required
          minLength={2}
          maxLength={20}
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder="收货人姓名"
        />
        {state.fieldErrors?.receiverName?.[0] && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.receiverName[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="receiverPhone" className="mb-1 block text-sm font-medium">
          手机号
        </label>
        <input
          id="receiverPhone"
          name="receiverPhone"
          required
          inputMode="numeric"
          maxLength={11}
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder="11 位手机号"
        />
        {state.fieldErrors?.receiverPhone?.[0] && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.receiverPhone[0]}</p>
        )}
      </div>
      <div>
        <label htmlFor="receiverAddress" className="mb-1 block text-sm font-medium">
          收货地址
        </label>
        <textarea
          id="receiverAddress"
          name="receiverAddress"
          required
          rows={3}
          minLength={5}
          maxLength={200}
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder="详细收货地址"
        />
        {state.fieldErrors?.receiverAddress?.[0] && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.receiverAddress[0]}</p>
        )}
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-red-600 py-2.5 text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "提交中…" : "提交订单"}
      </button>
    </form>
  );
}
