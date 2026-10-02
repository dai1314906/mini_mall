/** 订单状态机（纯函数，零依赖，下单/支付/发货/收货/取消共用同一判定） */

export const ORDER_STATUSES = ["PENDING", "PAID", "CANCELLED", "SHIPPED", "COMPLETED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** 合法流转矩阵 */
export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["PAID", "CANCELLED"], // 用户支付 / 取消
  PAID: ["SHIPPED", "CANCELLED"], // 管理员发货 / 退款取消
  SHIPPED: ["COMPLETED"], // 确认收货
  CANCELLED: [], // 终态
  COMPLETED: [], // 终态
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "待支付",
  PAID: "已支付",
  CANCELLED: "已取消",
  SHIPPED: "已发货",
  COMPLETED: "已完成",
};

export class OrderStateError extends Error {}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** 当前状态可流转到的状态（驱动 UI 按钮显隐） */
export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return [...TRANSITIONS[from]];
}

/** 流转校验：非法流转抛中文错误 */
export function transition(from: OrderStatus, to: OrderStatus): OrderStatus {
  if (!canTransition(from, to)) {
    throw new OrderStateError(`订单状态不能从「${STATUS_LABELS[from]}」变更为「${STATUS_LABELS[to]}」`);
  }
  return to;
}

/**
 * 用户侧合法流转：支付/取消待支付订单、确认收货。
 * 管理员专属操作（发货、退款取消已支付订单）对用户不可用。
 */
export function userCanTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (
    (from === "PENDING" && (to === "PAID" || to === "CANCELLED")) ||
    (from === "SHIPPED" && to === "COMPLETED")
  );
}
