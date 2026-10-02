import { describe, expect, it } from "vitest";
import { userCanTransition } from "@/lib/core/order-machine";

describe("userCanTransition 用户侧合法流转（修复 I2：用户不可自助退款已支付订单）", () => {
  it("用户可以支付待支付订单", () => {
    expect(userCanTransition("PENDING", "PAID")).toBe(true);
  });

  it("用户可以取消待支付订单", () => {
    expect(userCanTransition("PENDING", "CANCELLED")).toBe(true);
  });

  it("用户可以确认收货", () => {
    expect(userCanTransition("SHIPPED", "COMPLETED")).toBe(true);
  });

  it("用户不能取消已支付订单（退款是管理员专属）", () => {
    expect(userCanTransition("PAID", "CANCELLED")).toBe(false);
  });

  it("用户不能发货/处理终态", () => {
    expect(userCanTransition("PAID", "SHIPPED")).toBe(false);
    expect(userCanTransition("CANCELLED", "PAID")).toBe(false);
    expect(userCanTransition("COMPLETED", "CANCELLED")).toBe(false);
  });
});
