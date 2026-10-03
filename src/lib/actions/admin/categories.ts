"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { categorySchema } from "@/lib/validations/product";
import { createCategoryService, deleteCategoryService, makeCategorySlug } from "@/lib/services/category-service";

export interface AdminActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createCategory(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const result = await createCategoryService(parsed.data.name);
  if (!result.ok) return { ok: false, error: result.error };
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
  const result = await deleteCategoryService(id);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return { ok: true };
}
