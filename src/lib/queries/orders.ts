import "server-only";

import { prisma } from "@/lib/db";

/** 用户订单列表（含订单项快照） */
export async function listOrders(userId: number) {
  return prisma.order.findMany({
    where: { userId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

/** 订单详情（含订单项快照；归属校验由调用方完成） */
export async function getOrderDetail(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
}
