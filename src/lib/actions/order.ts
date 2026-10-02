"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { cancelWithRestock } from "@/lib/services/order-service";
import { transition, userCanTransition, type OrderStatus } from "@/lib/core/order-machine";
import { calcMemberLevel, upgradeLevel, type MemberLevel } from "@/lib/core/member";

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

  const order = await prisma.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order) return { ok: false, error: "订单不存在" };
  try {
    transition(order.status as OrderStatus, "PAID");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "订单状态不正确" };
  }

  // 事务内原子自增并从返回值重算等级——绝不使用请求前缓存的 totalSpentCents 做绝对写（防并发丢失更新）
  const upgraded = await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" }, // 并发双保险
      data: { status: "PAID", paidAt: new Date() },
    });
    if (res.count === 0) return null; // 已被并发处理
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { totalSpentCents: { increment: order.totalAmount } },
    });
    // 自增已入账，基于事务内读回的最新值重算等级（只升不降）
    const nextLevel = upgradeLevel(updated.memberLevel as MemberLevel, calcMemberLevel(updated.totalSpentCents));
    if (nextLevel !== updated.memberLevel) {
      await tx.user.update({ where: { id: user.id }, data: { memberLevel: nextLevel } });
    }
    return nextLevel !== updated.memberLevel ? nextLevel : undefined;
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/checkout");
  if (upgraded === null) return { ok: false, error: "订单状态已变更，请刷新页面" };
  redirect(upgraded ? `/orders/${orderId}?paid=1&level=${upgraded}` : `/orders/${orderId}?paid=1`);
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
