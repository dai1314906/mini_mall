"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { cartQuantitySchema } from "@/lib/validations/cart";
import { clampQuantity } from "@/lib/core/cart-math";

export interface CartActionState {
  ok: boolean;
  message?: string; // 成功提示（如"已达库存上限"）
  error?: string;
}

/** 加购：单条 upsert（@@unique 保证一人一商品一行），数量钳制到库存上限 */
export async function addToCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const next = typeof formData.get("next") === "string" ? (formData.get("next") as string) : "/products";
  const user = await requireUser(next);

  const parsed = cartQuantitySchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? "1",
  });
  if (!parsed.success) return { ok: false, error: "参数不正确" };
  const { productId, quantity } = parsed.data;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) return { ok: false, error: "商品不存在或已下架" };
  if (product.stock < 1) return { ok: false, error: "商品已售罄" };

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: user.id, productId } },
  });
  const before = existing?.quantity ?? 0;
  const newQuantity = clampQuantity(before + quantity, product.stock);

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    update: { quantity: newQuantity },
    create: { userId: user.id, productId, quantity: newQuantity },
  });

  revalidatePath("/cart");
  const clamped = before + quantity > product.stock;
  return {
    ok: true,
    message: clamped ? `已达库存上限（${product.stock} 件），数量已调整` : "已加入购物车",
  };
}

/** 修改数量（上限库存、下限 1） */
export async function updateCartQuantity(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const user = await requireUser("/cart");
  const parsed = cartQuantitySchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { ok: false, error: "参数不正确" };
  const { productId, quantity } = parsed.data;

  // 行归属校验：只允许改自己的购物车行
  const item = await prisma.cartItem.findFirst({
    where: { productId, userId: user.id },
    include: { product: { select: { stock: true } } },
  });
  if (!item) return { ok: false, error: "购物车中没有该商品" };

  const newQuantity = clampQuantity(quantity, item.product.stock);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: newQuantity } });
  revalidatePath("/cart");

  return {
    ok: true,
    message: quantity !== newQuantity ? `已达库存上限（${item.product.stock} 件），数量已调整` : undefined,
  };
}

/** 删除购物车行（幂等） */
export async function removeFromCart(formData: FormData): Promise<void> {
  const user = await requireUser("/cart");
  const productId = Number(formData.get("productId"));
  if (!Number.isInteger(productId) || productId < 1) return;
  await prisma.cartItem.deleteMany({ where: { userId: user.id, productId } });
  revalidatePath("/cart");
}
