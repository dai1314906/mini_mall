import { z } from "zod";

/** 结算收货信息校验 */
export const checkoutSchema = z.object({
  receiverName: z.string().trim().min(2, "收货人姓名至少 2 个字符").max(20, "收货人姓名最多 20 个字符"),
  receiverPhone: z.string().trim().regex(/^1\d{10}$/, "请输入 11 位手机号"),
  receiverAddress: z.string().trim().min(5, "请输入详细收货地址").max(200, "收货地址最多 200 个字符"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
