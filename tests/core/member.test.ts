import { describe, expect, it } from "vitest";
import {
  LEVEL_CONFIG,
  applyDiscount,
  calcMemberLevel,
  discountRateFor,
  formatDiscountRate,
  levelLabel,
  upgradeLevel,
} from "@/lib/core/member";

describe("calcMemberLevel 等级计算（阈值边界）", () => {
  it("未达标为 NONE", () => {
    expect(calcMemberLevel(0)).toBe("NONE");
    expect(calcMemberLevel(799999)).toBe("NONE"); // 7999.99 元
  });

  it("达到 8000 元为心悦1级", () => {
    expect(calcMemberLevel(800000)).toBe("LV1");
    expect(calcMemberLevel(7999999)).toBe("LV1");
  });

  it("达到 80000 元为心悦2级", () => {
    expect(calcMemberLevel(8000000)).toBe("LV2");
    expect(calcMemberLevel(79999999)).toBe("LV2");
  });

  it("达到 800000 元为心悦3级", () => {
    expect(calcMemberLevel(80000000)).toBe("LV3");
    expect(calcMemberLevel(999999999)).toBe("LV3");
  });
});

describe("discountRateFor 折扣率", () => {
  it("无等级无折扣", () => {
    expect(discountRateFor("NONE")).toBe(100);
  });
  it("等级折扣率正确", () => {
    expect(discountRateFor("LV1")).toBe(98);
    expect(discountRateFor("LV2")).toBe(95);
    expect(discountRateFor("LV3")).toBe(90);
    expect(LEVEL_CONFIG.LV1.thresholdCents).toBe(800000);
    expect(LEVEL_CONFIG.LV2.thresholdCents).toBe(8000000);
    expect(LEVEL_CONFIG.LV3.thresholdCents).toBe(80000000);
  });
});

describe("applyDiscount 折扣计算（四舍五入到分）", () => {
  it("整单打折", () => {
    expect(applyDiscount(10000, 98)).toBe(9800);
    expect(applyDiscount(10000, 95)).toBe(9500);
    expect(applyDiscount(10000, 90)).toBe(9000);
    expect(applyDiscount(10000, 100)).toBe(10000);
  });

  it("四舍五入", () => {
    expect(applyDiscount(1, 98)).toBe(1); // 0.98 → 1
    expect(applyDiscount(51, 98)).toBe(50); // 49.98 → 50
    expect(applyDiscount(333, 95)).toBe(316); // 316.35 → 316
    expect(applyDiscount(333, 90)).toBe(300); // 299.7 → 300
  });
});

describe("formatDiscountRate 折扣显示", () => {
  it("折扣文案", () => {
    expect(formatDiscountRate(100)).toBe("无折扣");
    expect(formatDiscountRate(98)).toBe("9.8折");
    expect(formatDiscountRate(95)).toBe("9.5折");
    expect(formatDiscountRate(90)).toBe("9折");
  });
});

describe("upgradeLevel 只升不降", () => {
  it("升级", () => {
    expect(upgradeLevel("NONE", "LV1")).toBe("LV1");
    expect(upgradeLevel("LV1", "LV3")).toBe("LV3");
  });
  it("不降级", () => {
    expect(upgradeLevel("LV2", "LV1")).toBe("LV2");
    expect(upgradeLevel("LV3", "NONE")).toBe("LV3");
    expect(upgradeLevel("LV2", "LV2")).toBe("LV2");
  });
});

describe("levelLabel 等级文案", () => {
  it("中文名", () => {
    expect(levelLabel("NONE")).toBe("普通会员");
    expect(levelLabel("LV1")).toBe("心悦1级");
    expect(levelLabel("LV2")).toBe("心悦2级");
    expect(levelLabel("LV3")).toBe("心悦3级");
  });
});
