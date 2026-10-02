"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { cancelWithRestock } from "@/lib/services/order-service";
import { transition, type OrderStatus } from "@/lib/core/order-machine";

export interface AdminOrderActionState {
  ok: boolean;
  error?: string;
}

function parseOrderId(formData: FormData): number {
  return Number(formData.get("orderId"));
}

/** 发货：PAID → SHIPPED */
export async function shipOrder(_prev: AdminOrderActionState, formData: FormData): Promise<AdminOrderActionState> {
  await requireAdmin();
  const orderId = parseOrderId(formData);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "订单不存在" };
  try {
    transition(order.status as OrderStatus, "SHIPPED");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "订单状态不正确" };
  }
  await prisma.order.updateMany({
    where: { id: orderId, status: "PAID" },
    data: { status: "SHIPPED", shippedAt: new Date() },
  });
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${orderId}?shipped=1`);
}

/** 退款取消：PAID → CANCELLED（回补库存 + 扣回累计消费） */
export async function refundOrder(_prev: AdminOrderActionState, formData: FormData): Promise<AdminOrderActionState> {
  await requireAdmin();
  const orderId = parseOrderId(formData);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "订单不存在" };
  try {
    transition(order.status as OrderStatus, "CANCELLED");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "订单状态不正确" };
  }
  await cancelWithRestock(orderId);
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
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "订单不存在" };
  try {
    transition(order.status as OrderStatus, "COMPLETED");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "订单状态不正确" };
  }
  await prisma.order.updateMany({
    where: { id: orderId, status: "SHIPPED" },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${orderId}?completed=1`);
}
