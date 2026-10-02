import "server-only";

import { prisma } from "@/lib/db";

/** 用户购物车（含商品实时信息） */
export async function getCartItems(userId: number) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: { select: { id: true, name: true, price: true, stock: true, image: true, isActive: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** 购物车商品种类数（Header 角标用） */
export async function getCartCount(userId: number) {
  return prisma.cartItem.count({ where: { userId } });
}
