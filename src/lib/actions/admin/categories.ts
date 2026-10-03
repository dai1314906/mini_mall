"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { makeUniqueSlug, slugify } from "@/lib/core/slug";
import { categorySchema } from "@/lib/validations/product";

export interface AdminActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** 生成唯一 slug：中文名 slugify 为空时用随机后缀兜底；excludeId 用于改名时排除自身 */
async function makeCategorySlug(name: string, excludeId?: number): Promise<string> {
  const base = slugify(name) || `c-${Math.random().toString(36).slice(2, 8)}`;
  return makeUniqueSlug(base, async (slug) => {
    const found = await prisma.category.findFirst({ where: { slug } });
    return found !== null && found.id !== excludeId;
  });
}

export async function createCategory(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    const slug = await makeCategorySlug(parsed.data.name);
    await prisma.category.create({ data: { name: parsed.data.name, slug } });
  } catch {
    return { ok: false, error: "分类名已存在或 slug 冲突" };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return { ok: true };
}

export async function updateCategory(id: number, _prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "分类不存在" };
  // 未改名时保留原 slug：中文名每次保存都会重新随机兜底 slug，会把已发布链接全部打碎
  const slug = existing.name === parsed.data.name ? existing.slug : await makeCategorySlug(parsed.data.name, id);
  try {
    await prisma.category.update({ where: { id }, data: { name: parsed.data.name, slug } });
  } catch {
    return { ok: false, error: "分类名已存在或分类不存在" };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return { ok: true };
}

export async function deleteCategory(id: number, _formData: FormData): Promise<AdminActionState> {
  void _formData;
  await requireAdmin();
  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    // Restrict：该分类下还有商品
    return { ok: false, error: "该分类下还有商品，无法删除" };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return { ok: true };
}
