import { z } from "zod";
import { yuanToCents } from "@/lib/core/money";

/** 商品表单校验（价格以元字符串输入，金额合法性走 core/money 的统一入口） */
export const productSchema = z.object({
  name: z.string().trim().min(1, "请输入商品名称").max(50, "商品名称最多 50 字"),
  description: z.string().trim().max(500, "商品描述最多 500 字").optional().default(""),
  price: z.string().refine(
    (v) => {
      try {
        yuanToCents(v);
        return true;
      } catch {
        return false;
      }
    },
    { error: "价格格式不正确（非负数字，最多两位小数）" },
  ),
  stock: z.coerce.number().int("库存必须是整数").min(0, "库存不能为负").max(1_000_000, "库存超出上限"),
  categoryId: z.coerce.number().int().positive("请选择分类"),
  image: z.string().trim().max(200).optional().default(""),
});

export type ProductInput = z.infer<typeof productSchema>;

/** 分类表单校验 */
export const categorySchema = z.object({
  name: z.string().trim().min(1, "请输入分类名称").max(20, "分类名称最多 20 字"),
});

export type CategoryInput = z.infer<typeof categorySchema>;
