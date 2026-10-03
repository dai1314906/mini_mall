"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { checkoutSchema } from "@/lib/validations/checkout";
import { createOrderFromCart, CheckoutError } from "@/lib/services/order-service";
import type { MemberLevel } from "@/lib/core/member";

export interface CheckoutActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function checkout(_prev: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  const user = await requireUser("/checkout");
  const parsed = checkoutSchema.safeParse({
    receiverName: formData.get("receiverName"),
    receiverPhone: formData.get("receiverPhone"),
    receiverAddress: formData.get("receiverAddress"),
  });
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  let orderId: number;
  try {
    ({ id: orderId } = await createOrderFromCart(user.id, user.memberLevel as MemberLevel, parsed.data));
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    throw e;
  }
  // redirect 放在 try 之外：避免 NEXT_REDIRECT 穿过业务错误处理
  revalidatePath("/cart");
  redirect(`/orders/${orderId}?created=1`);
}
