/**
 * 订单领域服务（非 Server Action，供已守卫的 action 与 API route 调用）。
 * 注意：此文件不含 'use server'，函数不会注册为可远程调用的入口。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cartTotals } from "@/lib/core/cart-math";
import { applyDiscount, calcMemberLevel, discountRateFor, refundSpent, upgradeLevel, type MemberLevel } from "@/lib/core/member";
import { generateOrderNo, randomDigits } from "@/lib/core/order-no";
import { adminCanTransition, STATUS_LABELS, transition, type OrderStatus } from "@/lib/core/order-machine";
import type { CheckoutInput } from "@/lib/validations/checkout";

/** 业务校验失败（库存不足/空车），返回给调用方而非抛 500 */
export class CheckoutError extends Error {}

/**
 * 从购物车创建订单：事务内 读购物车 → 核库存 → 扣库存（where stock>=qty 双保险）
 * → 建订单（快照）→ 建订单项 → 清购物车。订单号唯一冲突（P2002）整个事务重试 ≤3 次。
 */
export async function createOrderFromCart(
  userId: number,
  memberLevel: MemberLevel,
  receiver: CheckoutInput,
): Promise<{ id: number; orderNo: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await runCheckoutTx(userId, memberLevel, receiver);
    } catch (e) {
      if (e instanceof CheckoutError) throw e;
      const isConflict = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!isConflict) throw e;
      if (attempt === 2) throw new CheckoutError("下单失败，请重试");
    }
  }
  throw new CheckoutError("下单失败，请重试");
}

async function runCheckoutTx(
  userId: number,
  memberLevel: MemberLevel,
  receiver: CheckoutInput,
): Promise<{ id: number; orderNo: string }> {
  const rate = discountRateFor(memberLevel);
  return prisma.$transaction(async (tx) => {
    const items = await tx.cartItem.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, price: true, stock: true, image: true, isActive: true } },
      },
    });
    const active = items.filter((i) => i.product.isActive);
    if (active.length === 0) throw new CheckoutError("购物车是空的");

    for (const it of active) {
      if (it.product.stock < it.quantity) {
        throw new CheckoutError(`「${it.product.name}」库存不足（剩余 ${it.product.stock} 件）`);
      }
    }
    for (const it of active) {
      const res = await tx.product.updateMany({
        where: { id: it.product.id, stock: { gte: it.quantity } },
        data: { stock: { decrement: it.quantity } },
      });
      if (res.count === 0) {
        throw new CheckoutError(`「${it.product.name}」库存不足（剩余 ${it.product.stock} 件）`);
      }
    }

    const { totalCents } = cartTotals(
      active.map((i) => ({ unitPrice: i.product.price, quantity: i.quantity })),
    );
    const totalAmount = applyDiscount(totalCents, rate);

    const order = await tx.order.create({
      data: {
        orderNo: generateOrderNo(new Date(), randomDigits),
        userId,
        status: "PENDING",
        originalAmount: totalCents,
        totalAmount,
        discountRate: rate,
        receiverName: receiver.receiverName,
        receiverPhone: receiver.receiverPhone,
        receiverAddress: receiver.receiverAddress,
      },
    });
    await tx.orderItem.createMany({
      data: active.map((i) => ({
        orderId: order.id,
        productId: i.product.id,
        productName: i.product.name,
        productImage: i.product.image,
        unitPrice: i.product.price,
        quantity: i.quantity,
      })),
    });
    await tx.cartItem.deleteMany({ where: { userId } });
    return { id: order.id, orderNo: order.orderNo };
  });
}

/** 模拟支付：PENDING → PAID；累计消费 + 会员升级（只升不降）。并发防护与 action 版一致 */
export async function payOrderService(
  userId: number,
  orderId: number,
): Promise<
  | { ok: true; status: "PAID"; upgradedLevel?: MemberLevel }
  | { ok: false; error: string; reason: "NOT_FOUND" | "CONFLICT" }
> {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId } });
  if (!order) return { ok: false, error: "订单不存在", reason: "NOT_FOUND" };
  try {
    transition(order.status as OrderStatus, "PAID");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "订单状态不正确", reason: "CONFLICT" };
  }

  // 事务内原子自增并从返回值重算等级——绝不使用请求前缓存的 totalSpentCents 做绝对写（防并发丢失更新）
  const upgraded = await prisma.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" }, // 并发双保险
      data: { status: "PAID", paidAt: new Date() },
    });
    if (res.count === 0) return null; // 已被并发处理
    const updated = await tx.user.update({
      where: { id: userId },
      data: { totalSpentCents: { increment: order.totalAmount } },
    });
    const nextLevel = upgradeLevel(updated.memberLevel as MemberLevel, calcMemberLevel(updated.totalSpentCents));
    if (nextLevel !== updated.memberLevel) {
      await tx.user.update({ where: { id: userId }, data: { memberLevel: nextLevel } });
    }
    return nextLevel !== updated.memberLevel ? nextLevel : undefined;
  });

  if (upgraded === null) return { ok: false, error: "订单状态已变更，请刷新页面", reason: "CONFLICT" };
  return { ok: true, status: "PAID", upgradedLevel: upgraded };
}

/** 管理员状态流转（管理 API 用）：发货 / 退款取消 / 确认收货。语义严于通用 transition（见 adminCanTransition） */
export async function adminTransitionOrder(
  orderId: number,
  target: "SHIPPED" | "CANCELLED" | "COMPLETED",
): Promise<
  | { ok: true; status: "SHIPPED" | "CANCELLED" | "COMPLETED" }
  | { ok: false; error: string; reason: "NOT_FOUND" | "CONFLICT" }
> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "订单不存在", reason: "NOT_FOUND" };

  const from = order.status as OrderStatus;
  if (!adminCanTransition(from, target)) {
    return {
      ok: false,
      error: `订单状态不能从「${STATUS_LABELS[from]}」变更为「${STATUS_LABELS[target]}」`,
      reason: "CONFLICT",
    };
  }

  if (target === "SHIPPED") {
    const res = await prisma.order.updateMany({
      where: { id: orderId, status: "PAID" },
      data: { status: "SHIPPED", shippedAt: new Date() },
    });
    if (res.count === 0) return { ok: false, error: "订单状态已变更，请刷新页面", reason: "CONFLICT" };
  } else if (target === "COMPLETED") {
    const res = await prisma.order.updateMany({
      where: { id: orderId, status: "SHIPPED" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    if (res.count === 0) return { ok: false, error: "订单状态已变更，请刷新页面", reason: "CONFLICT" };
  } else {
    // cancelWithRestock 内部含 PENDING/PAID 双保险与回补/扣回；并发下静默不处理，这里重查兜底
    await cancelWithRestock(orderId);
    const after = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (!after || after.status !== "CANCELLED") {
      return { ok: false, error: "订单状态已变更，请刷新页面", reason: "CONFLICT" };
    }
  }

  return { ok: true, status: target };
}

/** 取消订单并回补库存；PAID 退款时扣回累计消费（clamp ≥ 0，等级不降）。用户取消与管理员退款共用 */
export async function cancelWithRestock(orderId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;
    const res = await tx.order.updateMany({
      where: { id: orderId, status: { in: ["PENDING", "PAID"] } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (res.count === 0) return; // 并发下已被处理
    for (const item of order.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    if (order.status === "PAID") {
      // 事务内读回最新值再做 clamp 扣回，避免「读旧值写绝对量」的丢失更新
      const user = await tx.user.findUnique({ where: { id: order.userId } });
      if (user) {
        await tx.user.update({
          where: { id: order.userId },
          data: { totalSpentCents: refundSpent(user.totalSpentCents, order.totalAmount) },
        });
      }
    }
  });
}
