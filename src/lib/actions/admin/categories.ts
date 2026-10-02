"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { categorySchema } from "@/lib/validations/product";

export interface AdminActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createCategory(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await prisma.category.create({ data: { name: parsed.data.name } });
  } catch {
    return { ok: false, error: "分类名已存在" };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/products");
  return { ok: true };
}

export async function updateCategory(id: number, _prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await prisma.category.update({ where: { id }, data: { name: parsed.data.name } });
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
