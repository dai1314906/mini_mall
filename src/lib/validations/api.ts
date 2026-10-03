import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/core/order-machine";
import { yuanToCents } from "@/lib/core/money";

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

/** 路径 id 参数：只接受十进制正整数（拒绝 0x10/1e2/空格/小数尾缀等 Number() 会静默转换的写法），上限 32 位有符号整数 */
function positiveIntParamSchema(message: string) {
  return z
    .string()
    .regex(/^\d+$/, message)
    .transform(Number)
    .pipe(z.number().int().positive(message).max(2_147_483_647, message));
}

/** /api/products/[id] 路径参数 */
export const productIdSchema = positiveIntParamSchema("无效的商品 ID");

/** /api/cart/[id] 路径参数 */
export const cartItemIdSchema = positiveIntParamSchema("无效的购物车项 ID");

/** /api/orders/[id] 路径参数 */
export const orderIdSchema = positiveIntParamSchema("无效的订单 ID");

/** /api/admin/categories/[id] 路径参数 */
export const categoryIdSchema = positiveIntParamSchema("无效的分类 ID");

/** 购物车数量（JSON body 严格数字） */
export const quantitySchema = z.number().int().min(1, "数量至少为 1").max(999, "数量超出上限");

/** POST /api/cart 请求体 */
export const apiCartAddSchema = z.object({
  productId: z.number().int().positive("商品不存在"),
  quantity: quantitySchema.default(1),
});

/** GET /api/admin/orders 状态筛选查询参数 */
export const orderStatusSchema = z.enum(ORDER_STATUSES);

/** PUT /api/admin/orders/[id] 状态流转目标（白名单：非目标状态是请求本身非法） */
export const adminOrderTransitionSchema = z.object({
  status: z.enum(["SHIPPED", "CANCELLED", "COMPLETED"]),
});

/** 后台商品 JSON 请求体：数字字段严格校验（拒绝 FormData 式的 ''/null/true 宽松转换） */
export const apiAdminProductSchema = z.object({
  name: z.string().trim().min(1, "请输入商品名称").max(50, "商品名称最多 50 字"),
  description: z.string().trim().max(500, "商品描述最多 500 字").optional(),
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
  stock: z.number({ error: "库存必须是整数" }).int("库存必须是整数").min(0, "库存不能为负").max(1_000_000, "库存超出上限"),
  categoryId: z.number({ error: "请选择分类" }).int().positive("请选择分类"),
  image: z.string().trim().max(200).optional(),
});
