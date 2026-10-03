"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { cancelWithRestock, payOrderService } from "@/lib/services/order-service";
import { userCanTransition, type OrderStatus } from "@/lib/core/order-machine";

export interface OrderActionState {
  ok: boolean;
  message?: string;
  error?: string;
}

function parseOrderId(formData: FormData): number {
  return Number(formData.get("orderId"));
}

/** 模拟支付：PENDING → PAID；累计消费 + 会员升级（只升不降） */
export async function payOrder(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const user = await requireUser("/orders");
  const orderId = parseOrderId(formData);
  if (!Number.isInteger(orderId) || orderId < 1) return { ok: false, error: "参数不正确" };

  const result = await payOrderService(user.id, orderId);
  // 先失效缓存再返回结果：失败路径（并发冲突）也要让页面刷新到最新状态
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/checkout");
  if (!result.ok) return { ok: false, error: result.error };

  redirect(result.upgradedLevel ? `/orders/${orderId}?paid=1&level=${result.upgradedLevel}` : `/orders/${orderId}?paid=1`);
}

/** 用户取消订单：仅允许 PENDING → CANCELLED（已支付订单的退款是管理员专属） */
export async function cancelOrder(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const user = await requireUser("/orders");
  const orderId = parseOrderId(formData);
  if (!Number.isInteger(orderId) || orderId < 1) return { ok: false, error: "参数不正确" };

  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) return { ok: false, error: "订单不存在" };
  if (!userCanTransition(order.status as OrderStatus, "CANCELLED")) {
    return { ok: false, error: "当前状态不能取消（已支付订单请联系管理员退款）" };
  }

  await cancelWithRestock(orderId);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  redirect(`/orders/${orderId}?cancelled=1`);
}

/** 确认收货：SHIPPED → COMPLETED */
export async function completeOrder(_prev: OrderActionState, formData: FormData): Promise<OrderActionState> {
  const user = await requireUser("/orders");
  const orderId = parseOrderId(formData);
  if (!Number.isInteger(orderId) || orderId < 1) return { ok: false, error: "参数不正确" };

  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) return { ok: false, error: "订单不存在" };
  if (!userCanTransition(order.status as OrderStatus, "COMPLETED")) {
    return { ok: false, error: "当前状态不能确认收货" };
  }

  const res = await prisma.order.updateMany({
    where: { id: orderId, status: "SHIPPED" },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  if (res.count === 0) return { ok: false, error: "订单状态已变更，请刷新页面" };
  redirect(`/orders/${orderId}?completed=1`);
}
