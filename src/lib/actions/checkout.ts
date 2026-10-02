"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/checkout";
import { cartTotals } from "@/lib/core/cart-math";
import { applyDiscount, discountRateFor, type MemberLevel } from "@/lib/core/member";
import { generateOrderNo, randomDigits } from "@/lib/core/order-no";

export interface CheckoutActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** 业务校验失败（库存不足/空车），返回给用户而非抛 500 */
class CheckoutError extends Error {}

/**
 * 下单事务（原子性）：读购物车 → 核库存 → 扣库存（where stock>=qty 双保险）
 * → 建订单（快照原价/折扣率/实付）→ 建订单项（三快照）→ 清购物车
 */
async function runCheckout(
  userId: number,
  memberLevel: MemberLevel,
  receiver: CheckoutInput,
): Promise<number> {
  const rate = discountRateFor(memberLevel);
  return prisma.$transaction(async (tx) => {
    const items = await tx.cartItem.findMany({
      where: { userId },
      include: {
        product: { select: { id: true, name: true, price: true, stock: true, image: true, isActive: true } },
      },
    });
    const active = items.filter((i) => i.product.isActive);
    if (active.length === 0) throw new CheckoutError("购物车是空的");

    for (const it of active) {
      if (it.product.stock < it.quantity) {
        throw new CheckoutError(`「${it.product.name}」库存不足（剩余 ${it.product.stock} 件）`);
      }
    }
    for (const it of active) {
      const res = await tx.product.updateMany({
        where: { id: it.product.id, stock: { gte: it.quantity } },
        data: { stock: { decrement: it.quantity } },
      });
      if (res.count === 0) {
        throw new CheckoutError(`「${it.product.name}」库存不足（剩余 ${it.product.stock} 件）`);
      }
    }

    const { totalCents } = cartTotals(
      active.map((i) => ({ unitPrice: i.product.price, quantity: i.quantity })),
    );
    const totalAmount = applyDiscount(totalCents, rate);

    const order = await tx.order.create({
      data: {
        orderNo: generateOrderNo(new Date(), randomDigits),
        userId,
        status: "PENDING",
        originalAmount: totalCents,
        totalAmount,
        discountRate: rate,
        receiverName: receiver.receiverName,
        receiverPhone: receiver.receiverPhone,
        receiverAddress: receiver.receiverAddress,
      },
    });
    await tx.orderItem.createMany({
      data: active.map((i) => ({
        orderId: order.id,
        productId: i.product.id,
        productName: i.product.name,
        productImage: i.product.image,
        unitPrice: i.product.price,
        quantity: i.quantity,
      })),
    });
    await tx.cartItem.deleteMany({ where: { userId } });
    return order.id;
  });
}

export async function checkout(_prev: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  const user = await requireUser("/checkout");
  const parsed = checkoutSchema.safeParse({
    receiverName: formData.get("receiverName"),
    receiverPhone: formData.get("receiverPhone"),
    receiverAddress: formData.get("receiverAddress"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  // 订单号唯一冲突（P2002）时整个事务重试 ≤3 次（事务已整体回滚，重试安全）
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const orderId = await runCheckout(user.id, user.memberLevel as MemberLevel, parsed.data);
      revalidatePath("/cart");
      redirect(`/orders/${orderId}?created=1`);
    } catch (e) {
      if (e instanceof CheckoutError) return { ok: false, error: e.message };
      const isConflict = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!isConflict) throw e; // 包括 redirect 的 NEXT_REDIRECT
      if (attempt === 2) return { ok: false, error: "下单失败，请重试" };
    }
  }
  return { ok: false, error: "下单失败，请重试" };
}
