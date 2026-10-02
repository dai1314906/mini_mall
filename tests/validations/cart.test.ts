import { describe, expect, it } from "vitest";
import { cartQuantitySchema } from "@/lib/validations/cart";

describe("cartQuantitySchema 购物车数量校验", () => {
  it("接受合法输入", () => {
    expect(cartQuantitySchema.safeParse({ productId: "1", quantity: "3" }).success).toBe(true);
  });

  it("拒绝数量小于 1", () => {
    expect(cartQuantitySchema.safeParse({ productId: "1", quantity: "0" }).success).toBe(false);
    expect(cartQuantitySchema.safeParse({ productId: "1", quantity: "-1" }).success).toBe(false);
  });

  it("拒绝数量超上限", () => {
    expect(cartQuantitySchema.safeParse({ productId: "1", quantity: "1000" }).success).toBe(false);
  });

  it("拒绝非法商品 ID", () => {
    expect(cartQuantitySchema.safeParse({ productId: "0", quantity: "1" }).success).toBe(false);
    expect(cartQuantitySchema.safeParse({ productId: "", quantity: "1" }).success).toBe(false);
  });
});
