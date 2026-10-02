/**
 * 订单领域服务（非 Server Action，供已守卫的 action 调用）。
 * 注意：此文件不含 'use server'，函数不会注册为可远程调用的入口。
 */
import { prisma } from "@/lib/db";
import { refundSpent } from "@/lib/core/member";

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
