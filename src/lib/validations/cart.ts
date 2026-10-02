import { z } from "zod";

/** 购物车数量操作校验（FormData 字符串输入） */
export const cartQuantitySchema = z.object({
  productId: z.coerce.number().int().positive("商品不存在"),
  quantity: z.coerce.number().int().min(1, "数量至少为 1").max(999, "数量超出上限"),
});

export type CartQuantityInput = z.infer<typeof cartQuantitySchema>;
