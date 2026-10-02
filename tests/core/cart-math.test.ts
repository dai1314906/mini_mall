import { describe, expect, it } from "vitest";
import { cartTotals, clampQuantity } from "@/lib/core/cart-math";

describe("cartTotals 购物车金额合计", () => {
  it("空车合计为零", () => {
    expect(cartTotals([])).toEqual({ totalCents: 0, totalQuantity: 0 });
  });

  it("单行合计", () => {
    expect(cartTotals([{ unitPrice: 19900, quantity: 2 }])).toEqual({ totalCents: 39800, totalQuantity: 2 });
  });

  it("多行合计", () => {
    const lines = [
      { unitPrice: 100, quantity: 3 },
      { unitPrice: 250, quantity: 1 },
      { unitPrice: 50, quantity: 4 },
    ];
    expect(cartTotals(lines)).toEqual({ totalCents: 750, totalQuantity: 8 });
  });

  it("大数量合计", () => {
    expect(cartTotals([{ unitPrice: 88888888, quantity: 9 }])).toEqual({ totalCents: 799999992, totalQuantity: 9 });
  });
});

describe("clampQuantity 数量钳制", () => {
  it("范围内不变", () => {
    expect(clampQuantity(3, 10)).toBe(3);
    expect(clampQuantity(10, 10)).toBe(10);
  });

  it("超过库存钳到库存", () => {
    expect(clampQuantity(99, 7)).toBe(7);
  });

  it("下限为 1", () => {
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(-3, 5)).toBe(1);
  });
});
