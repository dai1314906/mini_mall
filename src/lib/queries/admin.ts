import "server-only";

import { prisma } from "@/lib/db";

/** 后台商品列表（含下架商品） */
export async function listAdminProducts() {
  const products = await prisma.product.findMany({
    include: { category: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    image: p.image,
    isActive: p.isActive,
    categoryName: p.category.name,
  }));
}

/** 后台商品详情（编辑表单回填） */
export async function getAdminProduct(id: number) {
  return prisma.product.findUnique({ where: { id } });
}

/** 后台订单列表（可按状态筛选，含买家信息与会员等级） */
export async function listAdminOrders(status?: string) {
  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    include: { user: { select: { email: true, memberLevel: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });
  return orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    status: o.status,
    totalAmount: o.totalAmount,
    buyerEmail: o.user.email,
    buyerLevel: o.user.memberLevel,
    createdAt: o.createdAt,
    items: o.items,
  }));
}

/** 后台仪表盘统计 */
export async function getDashboardStats() {
  const [productCount, orderCount, pendingOrders, userCount, totalSales] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.user.count(),
    prisma.order.aggregate({
      where: { status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
      _sum: { totalAmount: true },
    }),
  ]);
  return {
    productCount,
    orderCount,
    pendingOrders,
    userCount,
    totalSalesCents: totalSales._sum.totalAmount ?? 0,
  };
}
