import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: { _count: { select: { products: true } } };
}>;

/** 计数口径：all=全部（admin 删除判断用）、active=仅上架（公开 API 用）、none=不计数（纯导航用） */
type CountMode = "all" | "active" | "none";

/** 全部分类（含商品计数） */
export async function listCategories(): Promise<CategoryWithCount[]>;
export async function listCategories(options: { counts: Exclude<CountMode, "none"> }): Promise<CategoryWithCount[]>;
export async function listCategories(options: { counts: "none" }): Promise<Prisma.CategoryGetPayload<object>[]>;
export async function listCategories(options: { counts: CountMode }): Promise<CategoryWithCount[] | Prisma.CategoryGetPayload<object>[]>;
export async function listCategories(options: { counts?: CountMode } = { counts: "all" }) {
  return prisma.category.findMany({
    orderBy: { id: "asc" },
    include:
      options.counts === "none"
        ? undefined
        : {
            _count: {
              select: { products: options.counts === "active" ? { where: { isActive: true } } : true },
            },
          },
  });
}
