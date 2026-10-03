"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { adminTransitionOrder } from "@/lib/services/order-service";

export interface AdminOrderActionState {
  ok: boolean;
  error?: string;
}

function parseOrderId(formData: FormData): number {
  return Number(formData.get("orderId"));
}

/** 发货：PAID → SHIPPED（与 /api/admin/orders/[id] 共用 adminTransitionOrder，同一策略） */
export async function shipOrder(_prev: AdminOrderActionState, formData: FormData): Promise<AdminOrderActionState> {
  await requireAdmin();
  const orderId = parseOrderId(formData);
  const result = await adminTransitionOrder(orderId, "SHIPPED");
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${orderId}?shipped=1`);
}

/** 退款取消：PAID → CANCELLED（回补库存 + 扣回累计消费）。PENDING 不可由管理员取消 */
export async function refundOrder(_prev: AdminOrderActionState, formData: FormData): Promise<AdminOrderActionState> {
  await requireAdmin();
  const orderId = parseOrderId(formData);
  const result = await adminTransitionOrder(orderId, "CANCELLED");
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${orderId}?refunded=1`);
}

/** 管理员确认收货：SHIPPED → COMPLETED */
export async function adminCompleteOrder(
  _prev: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  await requireAdmin();
  const orderId = parseOrderId(formData);
  const result = await adminTransitionOrder(orderId, "COMPLETED");
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${orderId}?completed=1`);
}
