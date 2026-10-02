/** 购物车金额/数量纯函数（零依赖，购物车页/结算页/下单快照三处共用同一口径） */

export interface CartLineInput {
  unitPrice: number; // 分
  quantity: number;
}

/** 合计金额与数量 */
export function cartTotals(lines: CartLineInput[]): { totalCents: number; totalQuantity: number } {
  let totalCents = 0;
  let totalQuantity = 0;
  for (const line of lines) {
    totalCents += line.unitPrice * line.quantity;
    totalQuantity += line.quantity;
  }
  return { totalCents, totalQuantity };
}

/** 数量钳制到 [1, stock]（调用方保证 stock ≥ 1） */
export function clampQuantity(quantity: number, stock: number): number {
  return Math.max(1, Math.min(quantity, stock));
}
