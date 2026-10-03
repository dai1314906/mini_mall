/**
 * 购物车领域服务（非 Server Action，供已守卫的 action 与 API route 调用）。
 * 默认 reject 语义（库存不足直接报错）；站内表单传 { clamp: true } 保持钳制 UX。
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { clampQuantity } from "@/lib/core/cart-math";

export interface CartMutationOk {
  ok: true;
  itemId: number;
  quantity: number; // 实际写入数量
  clamped: boolean; // 是否发生钳制（仅 clamp 模式可能为 true）
  stock: number; // 商品库存（钳制文案用）
}

export type CartServiceResult =
  | CartMutationOk
  | { ok: false; error: string; reason: "NOT_FOUND" | "CONFLICT" };

/** 加购：单条 upsert（@@unique 保证一人一商品一行），合并已有数量。读-改-写包在事务内防并发丢失更新 */
export async function addCartItem(
  userId: number,
  productId: number,
  quantity: number,
  opts: { clamp?: boolean } = {},
): Promise<CartServiceResult> {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) return { ok: false, error: "商品不存在或已下架", reason: "NOT_FOUND" };
    if (product.stock < 1) return { ok: false, error: "商品已售罄", reason: "CONFLICT" };

    const existing = await tx.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    const desired = (existing?.quantity ?? 0) + quantity;
    if (desired > product.stock && !opts.clamp) {
      return { ok: false, error: `库存不足（剩余 ${product.stock} 件）`, reason: "CONFLICT" };
    }
    const newQuantity = opts.clamp ? clampQuantity(desired, product.stock) : desired;

    const item = await tx.cartItem.upsert({
      where: { userId_productId: { userId, productId } },
      update: { quantity: newQuantity },
      create: { userId, productId, quantity: newQuantity },
    });
    return { ok: true, itemId: item.id, quantity: newQuantity, clamped: desired !== newQuantity, stock: product.stock };
  });
}

async function updateCartItemInternal(
  userId: number,
  locate: { id: number } | { productId: number },
  quantity: number,
  opts: { clamp?: boolean } = {},
): Promise<CartServiceResult> {
  return prisma.$transaction(async (tx) => {
    // 行归属校验：只允许改自己的购物车行
    const item = await tx.cartItem.findFirst({
      where: { ...locate, userId },
      include: { product: { select: { stock: true, isActive: true } } },
    });
    if (!item) return { ok: false, error: "购物车中没有该商品", reason: "NOT_FOUND" };
    if (!item.product.isActive) return { ok: false, error: "商品不存在或已下架", reason: "NOT_FOUND" };

    const stock = item.product.stock;
    if (quantity > stock && !opts.clamp) {
      return { ok: false, error: `库存不足（剩余 ${stock} 件）`, reason: "CONFLICT" };
    }
    const newQuantity = opts.clamp ? clampQuantity(quantity, stock) : quantity;

    try {
      await tx.cartItem.update({ where: { id: item.id }, data: { quantity: newQuantity } });
    } catch (e) {
      // 并发下该行已被删除（另一标签页 DELETE / 商品被删级联）
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        return { ok: false, error: "购物车中没有该商品", reason: "NOT_FOUND" };
      }
      throw e;
    }
    return { ok: true, itemId: item.id, quantity: newQuantity, clamped: quantity !== newQuantity, stock };
  });
}

/** 修改数量（按购物车行 id，API 路径参数用） */
export async function updateCartItem(
  userId: number,
  itemId: number,
  quantity: number,
  opts: { clamp?: boolean } = {},
): Promise<CartServiceResult> {
  return updateCartItemInternal(userId, { id: itemId }, quantity, opts);
}

/** 修改数量（按商品 id，站内表单用） */
export async function updateCartItemByProduct(
  userId: number,
  productId: number,
  quantity: number,
  opts: { clamp?: boolean } = {},
): Promise<CartServiceResult> {
  return updateCartItemInternal(userId, { productId }, quantity, opts);
}

/** 删除购物车行（按购物车行 id，归属校验） */
export async function removeCartItem(
  userId: number,
  itemId: number,
): Promise<{ ok: true } | { ok: false; error: string; reason: "NOT_FOUND" }> {
  const res = await prisma.cartItem.deleteMany({ where: { id: itemId, userId } });
  if (res.count === 0) return { ok: false, error: "购物车中没有该商品", reason: "NOT_FOUND" };
  return { ok: true };
}
