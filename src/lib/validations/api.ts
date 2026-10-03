import { z } from "zod";

/** GET /api/products 查询参数 */
export const productListQuerySchema = z.object({
  // 正则先拒掉 0x10/1e2/小数等 Number() 会静默转换的写法，再做数值范围校验
  page: z
    .string()
    .regex(/^\d+$/, "page 需为正整数")
    .default("1")
    .transform(Number)
    .pipe(z.number().int().min(1).max(100_000)),
  search: z.string().trim().max(50).optional(),
  category: z.string().trim().max(50).optional(),
});

/** /api/products/[id] 路径参数 */
export const productIdSchema = z.coerce.number().int().positive();
