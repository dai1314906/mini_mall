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

/** 订单详情（含订单项快照；不做归属过滤，名称显式声明为管理员入口专用，用户侧请用 getOrderDetailForUser） */
export async function getAdminOrderDetail(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
}

/** 用户侧订单详情（含订单项快照；按归属过滤，非本人返回 null → 404） */
export async function getOrderDetailForUser(id: number, userId: number) {
  return prisma.order.findUnique({
    where: { id, userId },
    include: { items: true },
  });
}
