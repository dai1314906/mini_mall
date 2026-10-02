import { describe, expect, it } from "vitest";
import { generateOrderNo } from "@/lib/core/order-no";

const fixed = new Date(2026, 9, 2, 15, 30, 45); // 2026-10-02 15:30:45

describe("generateOrderNo 订单号生成", () => {
  it("注入固定时钟与随机源后格式确定", () => {
    expect(generateOrderNo(fixed, () => "123456")).toBe("20261002153045123456");
  });

  it("格式为 14 位时间戳 + 6 位随机", () => {
    const no = generateOrderNo(fixed, () => "000001");
    expect(no).toMatch(/^\d{20}$/);
  });

  it("不同随机源生成不同订单号", () => {
    expect(generateOrderNo(fixed, () => "111111")).not.toBe(generateOrderNo(fixed, () => "222222"));
  });

  it("补零正确（1 月 1 日凌晨）", () => {
    expect(generateOrderNo(new Date(2026, 0, 1, 0, 0, 5), () => "000000")).toBe("20260101000005000000");
  });
});
