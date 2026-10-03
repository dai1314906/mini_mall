import { describe, expect, it } from "vitest";
import {
  adminOrderTransitionSchema,
  apiAdminProductSchema,
  apiCartAddSchema,
  cartItemIdSchema,
  orderIdSchema,
  orderStatusSchema,
  productIdSchema,
  productListQuerySchema,
  quantitySchema,
} from "@/lib/validations/api";

describe("productListQuerySchema 商品列表查询参数", () => {
  it("缺省时 page 默认 1", () => {
    const r = productListQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.page).toBe(1);
  });

  it("接受字符串页码", () => {
    const r = productListQuerySchema.safeParse({ page: "3" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.page).toBe(3);
  });

  it("拒绝非法页码", () => {
    expect(productListQuerySchema.safeParse({ page: "abc" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ page: "-1" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ page: "1.5" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ page: "0x10" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ page: "1e2" }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ page: "" }).success).toBe(false);
  });

  it("接受搜索词与分类 slug", () => {
    expect(productListQuerySchema.safeParse({ search: "耳机" }).success).toBe(true);
    expect(productListQuerySchema.safeParse({ category: "digital" }).success).toBe(true);
  });

  it("拒绝超长搜索词与分类", () => {
    expect(productListQuerySchema.safeParse({ search: "x".repeat(51) }).success).toBe(false);
    expect(productListQuerySchema.safeParse({ category: "x".repeat(51) }).success).toBe(false);
  });
});

describe("productIdSchema 商品 ID 路径参数", () => {
  it("接受正整数", () => {
    const r = productIdSchema.safeParse("1");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe(1);
  });

  it("拒绝非正整数", () => {
    expect(productIdSchema.safeParse("abc").success).toBe(false);
    expect(productIdSchema.safeParse("1.5").success).toBe(false);
    expect(productIdSchema.safeParse("0").success).toBe(false);
    expect(productIdSchema.safeParse("-3").success).toBe(false);
    expect(productIdSchema.safeParse("").success).toBe(false);
  });
});

describe("cartItemIdSchema / orderIdSchema 路径参数", () => {
  it.each([cartItemIdSchema, orderIdSchema])("接受正整数", (schema) => {
    expect(schema.safeParse("1").success).toBe(true);
    expect(schema.safeParse("42").success).toBe(true);
  });

  it.each([cartItemIdSchema, orderIdSchema])("拒绝非法输入", (schema) => {
    expect(schema.safeParse("abc").success).toBe(false);
    expect(schema.safeParse("1.5").success).toBe(false);
    expect(schema.safeParse("0").success).toBe(false);
    expect(schema.safeParse("-3").success).toBe(false);
    expect(schema.safeParse("").success).toBe(false);
  });

  it.each([cartItemIdSchema, orderIdSchema, productIdSchema])("拒绝非十进制写法（0x/指数/空格/小数尾缀）", (schema) => {
    expect(schema.safeParse("0x10").success).toBe(false);
    expect(schema.safeParse("1e2").success).toBe(false);
    expect(schema.safeParse(" 42").success).toBe(false);
    expect(schema.safeParse("42.0").success).toBe(false);
  });

  it.each([cartItemIdSchema, orderIdSchema, productIdSchema])("拒绝超出 32 位整数范围", (schema) => {
    expect(schema.safeParse("99999999999999999999").success).toBe(false);
  });
});

describe("quantitySchema 购物车数量（JSON body 严格数字）", () => {
  it("接受 1-999 整数", () => {
    expect(quantitySchema.safeParse(1).success).toBe(true);
    expect(quantitySchema.safeParse(999).success).toBe(true);
  });

  it("拒绝越界、小数与非数字类型", () => {
    expect(quantitySchema.safeParse(0).success).toBe(false);
    expect(quantitySchema.safeParse(1000).success).toBe(false);
    expect(quantitySchema.safeParse(1.5).success).toBe(false);
    expect(quantitySchema.safeParse("3").success).toBe(false);
    expect(quantitySchema.safeParse(NaN).success).toBe(false);
    expect(quantitySchema.safeParse(Infinity).success).toBe(false);
  });
});

describe("orderStatusSchema 订单状态查询参数", () => {
  it("接受 5 个合法状态", () => {
    for (const s of ["PENDING", "PAID", "CANCELLED", "SHIPPED", "COMPLETED"]) {
      expect(orderStatusSchema.safeParse(s).success).toBe(true);
    }
  });

  it("拒绝非法状态", () => {
    expect(orderStatusSchema.safeParse("paid").success).toBe(false);
    expect(orderStatusSchema.safeParse("UNKNOWN").success).toBe(false);
    expect(orderStatusSchema.safeParse("").success).toBe(false);
  });
});

describe("adminOrderTransitionSchema 管理员流转目标", () => {
  it("接受 3 个合法目标", () => {
    for (const s of ["SHIPPED", "CANCELLED", "COMPLETED"]) {
      expect(adminOrderTransitionSchema.safeParse({ status: s }).success).toBe(true);
    }
  });

  it("拒绝非目标状态", () => {
    expect(adminOrderTransitionSchema.safeParse({ status: "PAID" }).success).toBe(false);
    expect(adminOrderTransitionSchema.safeParse({ status: "PENDING" }).success).toBe(false);
    expect(adminOrderTransitionSchema.safeParse({ status: "paid" }).success).toBe(false);
    expect(adminOrderTransitionSchema.safeParse({}).success).toBe(false);
  });
});

describe("apiCartAddSchema 加购请求体", () => {
  it("接受合法输入且数量默认 1", () => {
    const r = apiCartAddSchema.safeParse({ productId: 1, quantity: 2 });
    expect(r.success).toBe(true);
    const d = apiCartAddSchema.safeParse({ productId: 1 });
    expect(d.success).toBe(true);
    if (d.success) expect(d.data.quantity).toBe(1);
  });

  it("拒绝非法数量与商品", () => {
    expect(apiCartAddSchema.safeParse({ productId: 1, quantity: 0 }).success).toBe(false);
    expect(apiCartAddSchema.safeParse({ productId: 1, quantity: 1000 }).success).toBe(false);
    expect(apiCartAddSchema.safeParse({ productId: 1, quantity: 1.5 }).success).toBe(false);
    expect(apiCartAddSchema.safeParse({ productId: 0 }).success).toBe(false);
    expect(apiCartAddSchema.safeParse({ productId: -1 }).success).toBe(false);
  });
});

describe("apiAdminProductSchema 后台商品 JSON 请求体（严格数字）", () => {
  const valid = {
    name: "测试商品",
    description: "描述",
    price: "9.90",
    stock: 5,
    categoryId: 1,
    image: "",
  };

  it("接受合法输入", () => {
    expect(apiAdminProductSchema.safeParse(valid).success).toBe(true);
  });

  it("拒绝 FormData 式的宽松转换（空串/null/布尔/字符串数字）", () => {
    expect(apiAdminProductSchema.safeParse({ ...valid, stock: "" }).success).toBe(false);
    expect(apiAdminProductSchema.safeParse({ ...valid, stock: null }).success).toBe(false);
    expect(apiAdminProductSchema.safeParse({ ...valid, stock: true }).success).toBe(false);
    expect(apiAdminProductSchema.safeParse({ ...valid, stock: "5" }).success).toBe(false);
    expect(apiAdminProductSchema.safeParse({ ...valid, categoryId: "1" }).success).toBe(false);
  });

  it("拒绝非法价格与越界库存", () => {
    expect(apiAdminProductSchema.safeParse({ ...valid, price: "abc" }).success).toBe(false);
    expect(apiAdminProductSchema.safeParse({ ...valid, stock: -1 }).success).toBe(false);
    expect(apiAdminProductSchema.safeParse({ ...valid, stock: 1.5 }).success).toBe(false);
  });
});
