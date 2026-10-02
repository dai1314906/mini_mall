import { describe, expect, it } from "vitest";
import {
  ORDER_STATUSES,
  OrderStateError,
  STATUS_LABELS,
  TRANSITIONS,
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
