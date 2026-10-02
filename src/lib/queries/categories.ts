import "server-only";

import { prisma } from "@/lib/db";

/** 全部分类（含商品计数） */
export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { products: true } } },
  });
}
