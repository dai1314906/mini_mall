import { describe, expect, it } from "vitest";
import { applyPayment, refundSpent } from "@/lib/core/member";

describe("applyPayment 支付入账（修复 C1 的账目规则）", () => {
  it("累加支付金额并计算新等级", () => {
    expect(applyPayment({ totalSpentCents: 0, memberLevel: "NONE" }, 10000)).toEqual({
      totalSpentCents: 10000,
      memberLevel: "NONE",
    });
  });

  it("跨过 8000 元阈值升级心悦1级", () => {
    expect(applyPayment({ totalSpentCents: 799900, memberLevel: "NONE" }, 200)).toEqual({
      totalSpentCents: 800100,
      memberLevel: "LV1",
    });
  });

  it("等级只升不降（当前 LV1 时小笔支付不回退）", () => {
    expect(applyPayment({ totalSpentCents: 800000, memberLevel: "LV1" }, 100)).toEqual({
      totalSpentCents: 800100,
      memberLevel: "LV1",
    });
  });

  it("跨多级时升到最高档", () => {
    expect(applyPayment({ totalSpentCents: 79999999, memberLevel: "LV1" }, 2)).toEqual({
      totalSpentCents: 80000001,
      memberLevel: "LV3",
    });
  });
});

describe("refundSpent 退款扣回（修复 I1：clamp ≥ 0）", () => {
  it("正常扣回", () => {
    expect(refundSpent(10000, 4000)).toBe(6000);
  });

  it("扣到 0 为止，不为负", () => {
    expect(refundSpent(100, 500)).toBe(0);
    expect(refundSpent(0, 100)).toBe(0);
  });
});
