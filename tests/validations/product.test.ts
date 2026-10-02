import { describe, expect, it } from "vitest";
import { categorySchema, productSchema } from "@/lib/validations/product";

const valid = {
  name: "无线蓝牙耳机",
  description: "主动降噪",
  price: "199.00",
  stock: "50",
  categoryId: "1",
  image: "/uploads/a.webp",
};

describe("productSchema 商品表单校验", () => {
  it("接受合法输入", () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  it("允许图片为空", () => {
    expect(productSchema.safeParse({ ...valid, image: "" }).success).toBe(true);
  });

  it("拒绝非法价格", () => {
    expect(productSchema.safeParse({ ...valid, price: "abc" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, price: "1.234" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, price: "-5" }).success).toBe(false);
  });

  it("拒绝负库存", () => {
    expect(productSchema.safeParse({ ...valid, stock: "-1" }).success).toBe(false);
  });

  it("拒绝缺失分类", () => {
    expect(productSchema.safeParse({ ...valid, categoryId: "0" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, categoryId: "" }).success).toBe(false);
  });

  it("拒绝空名称", () => {
    expect(productSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
  });
});

describe("categorySchema 分类表单校验", () => {
  it("接受合法名称", () => {
    expect(categorySchema.safeParse({ name: "数码" }).success).toBe(true);
  });

  it("拒绝空名称与超长名称", () => {
    expect(categorySchema.safeParse({ name: " " }).success).toBe(false);
    expect(categorySchema.safeParse({ name: "x".repeat(21) }).success).toBe(false);
  });
});
