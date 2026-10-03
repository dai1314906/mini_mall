"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { cartQuantitySchema } from "@/lib/validations/cart";
import { addCartItem, updateCartItemByProduct } from "@/lib/services/cart-service";

export interface CartActionState {
  ok: boolean;
  message?: string; // 成功提示（如"已达库存上限"）
  error?: string;
}

/** 加购：合并已有数量，clamp 模式保持"钳制到库存上限"的站内 UX */
export async function addToCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const next = typeof formData.get("next") === "string" ? (formData.get("next") as string) : "/products";
  const user = await requireUser(next);

  const parsed = cartQuantitySchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? "1",
  });
  if (!parsed.success) return { ok: false, error: "参数不正确" };
  const { productId, quantity } = parsed.data;

  const result = await addCartItem(user.id, productId, quantity, { clamp: true });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/cart");

  return {
    ok: true,
    message: result.clamped ? `已达库存上限（${result.stock} 件），数量已调整` : "已加入购物车",
  };
}

/** 修改数量（上限库存、下限 1；clamp 模式保持站内 UX） */
export async function updateCartQuantity(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const user = await requireUser("/cart");
  const parsed = cartQuantitySchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { ok: false, error: "参数不正确" };
  const { productId, quantity } = parsed.data;

  const result = await updateCartItemByProduct(user.id, productId, quantity, { clamp: true });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/cart");

  return {
    ok: true,
    message: result.clamped ? `已达库存上限（${result.stock} 件），数量已调整` : undefined,
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
