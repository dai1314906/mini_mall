"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { productSchema } from "@/lib/validations/product";
import { yuanToCents } from "@/lib/core/money";

export interface AdminActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function parseForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    categoryId: formData.get("categoryId"),
    image: formData.get("image"),
  });
}

export async function createProduct(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;

  await prisma.product.create({
    data: {
      name: d.name,
      description: d.description ?? "",
      price: yuanToCents(d.price),
      stock: d.stock,
      categoryId: d.categoryId,
      image: d.image || null,
    },
  });
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function updateProduct(id: number, _prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;

  await prisma.product.update({
    where: { id },
    data: {
      name: d.name,
      description: d.description ?? "",
      price: yuanToCents(d.price),
      stock: d.stock,
      categoryId: d.categoryId,
      image: d.image || null,
    },
  });
  revalidatePath("/products");
  redirect("/admin/products");
}

/** 上架/下架切换 */
export async function toggleProductActive(id: number, _formData: FormData): Promise<void> {
  void _formData; // 绑定 form action 需要该参数位
  await requireAdmin();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return;
  await prisma.product.update({ where: { id }, data: { isActive: !product.isActive } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

/** 删除商品（OrderItem SetNull、CartItem Cascade 兜底历史数据） */
export async function deleteProduct(id: number, _formData: FormData): Promise<void> {
  void _formData;
  await requireAdmin();
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin/products");
  revalidatePath("/products");
}
