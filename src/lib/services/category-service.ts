/**
 * 分类领域服务（非 Server Action，供已守卫的 action 与 API route 调用）。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { makeUniqueSlug, slugify } from "@/lib/core/slug";

/** 生成唯一 slug：中文名 slugify 为空时用随机后缀兜底；excludeId 用于改名时排除自身 */
export async function makeCategorySlug(name: string, excludeId?: number): Promise<string> {
  const base = slugify(name) || `c-${Math.random().toString(36).slice(2, 8)}`;
  return makeUniqueSlug(base, async (slug) => {
    const found = await prisma.category.findFirst({ where: { slug } });
    return found !== null && found.id !== excludeId;
  });
}

export async function createCategoryService(
  name: string,
): Promise<
  | { ok: true; data: { id: number; name: string; slug: string } }
  | { ok: false; error: string; reason: "CONFLICT" }
> {
  try {
    const slug = await makeCategorySlug(name);
    const category = await prisma.category.create({ data: { name, slug } });
    return { ok: true, data: { id: category.id, name: category.name, slug: category.slug } };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "分类名已存在或 slug 冲突", reason: "CONFLICT" };
    }
    throw e;
  }
}

export async function deleteCategoryService(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string; reason: "NOT_FOUND" | "CONFLICT" }> {
  try {
    await prisma.category.delete({ where: { id } });
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "分类不存在", reason: "NOT_FOUND" };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      // Restrict：该分类下还有商品
      return { ok: false, error: "该分类下还有商品，无法删除", reason: "CONFLICT" };
    }
    throw e;
  }
}
