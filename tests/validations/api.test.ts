import { describe, expect, it } from "vitest";
import { productIdSchema, productListQuerySchema } from "@/lib/validations/api";

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
