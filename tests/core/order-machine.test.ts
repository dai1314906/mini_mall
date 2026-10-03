import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  OrderStateError,
  STATUS_LABELS,
  TRANSITIONS,
  adminCanTransition,
  canTransition,
  nextStatuses,
  transition,
} from "@/lib/core/order-machine";

describe("订单状态机", () => {
  it("全矩阵与 TRANSITIONS 一致", () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        expect(canTransition(from, to)).toBe(TRANSITIONS[from].includes(to));
      }
    }
  });

  it("合法流转返回目标状态", () => {
    expect(transition("PENDING", "PAID")).toBe("PAID");
    expect(transition("PAID", "SHIPPED")).toBe("SHIPPED");
    expect(transition("SHIPPED", "COMPLETED")).toBe("COMPLETED");
    expect(transition("PAID", "CANCELLED")).toBe("CANCELLED");
  });

  it("非法流转抛中文错误", () => {
    expect(() => transition("PENDING", "SHIPPED")).toThrow(OrderStateError);
    expect(() => transition("PENDING", "COMPLETED")).toThrow(/不能/);
    expect(() => transition("CANCELLED", "PAID")).toThrow(OrderStateError);
    expect(() => transition("COMPLETED", "CANCELLED")).toThrow(OrderStateError);
    expect(() => transition("PAID", "PENDING")).toThrow(OrderStateError);
  });

  it("终态无后继，待支付可支付/取消", () => {
    expect(nextStatuses("CANCELLED")).toEqual([]);
    expect(nextStatuses("COMPLETED")).toEqual([]);
    expect(nextStatuses("PENDING")).toEqual(["PAID", "CANCELLED"]);
    expect(nextStatuses("PAID")).toEqual(["SHIPPED", "CANCELLED"]);
    expect(nextStatuses("SHIPPED")).toEqual(["COMPLETED"]);
  });

  it("状态中文映射完整", () => {
    expect(STATUS_LABELS.PENDING).toBe("待支付");
    expect(STATUS_LABELS.PAID).toBe("已支付");
    expect(STATUS_LABELS.CANCELLED).toBe("已取消");
    expect(STATUS_LABELS.SHIPPED).toBe("已发货");
    expect(STATUS_LABELS.COMPLETED).toBe("已完成");
  });
});

describe("adminCanTransition 管理员流转", () => {
  it("合法流转：发货/退款/确认收货", () => {
    expect(adminCanTransition("PAID", "SHIPPED")).toBe(true);
    expect(adminCanTransition("PAID", "CANCELLED")).toBe(true);
    expect(adminCanTransition("SHIPPED", "COMPLETED")).toBe(true);
  });

  it("拒绝用户侧流转（管理员不代用户取消待支付订单）", () => {
    expect(adminCanTransition("PENDING", "CANCELLED")).toBe(false);
    expect(adminCanTransition("PENDING", "SHIPPED")).toBe(false);
    expect(adminCanTransition("PAID", "COMPLETED")).toBe(false);
    expect(adminCanTransition("SHIPPED", "CANCELLED")).toBe(false);
  });

  it("终态无任何流转", () => {
    expect(adminCanTransition("CANCELLED", "PAID")).toBe(false);
    expect(adminCanTransition("COMPLETED", "CANCELLED")).toBe(false);
  });
});
