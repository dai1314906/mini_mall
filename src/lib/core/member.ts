/** 心悦会员体系（纯函数，零依赖）
 *  等级按累计消费金额（支付成功订单实付金额）计算，只升不降。
 */

export const MEMBER_LEVELS = ["NONE", "LV1", "LV2", "LV3"] as const;
export type MemberLevel = (typeof MEMBER_LEVELS)[number];

export interface LevelConfig {
  thresholdCents: number; // 累计消费阈值（分）
  discountRate: number; // 后续订单折扣率：98 = 9.8 折
  label: string;
}

export const LEVEL_CONFIG: Record<Exclude<MemberLevel, "NONE">, LevelConfig> = {
  LV1: { thresholdCents: 800000, discountRate: 98, label: "心悦1级" }, // 累计 8000 元 → 9.8 折
  LV2: { thresholdCents: 8000000, discountRate: 95, label: "心悦2级" }, // 累计 80000 元 → 9.5 折
  LV3: { thresholdCents: 80000000, discountRate: 90, label: "心悦3级" }, // 累计 800000 元 → 9 折
};

/** 按累计消费金额计算等级 */
export function calcMemberLevel(totalSpentCents: number): MemberLevel {
  if (totalSpentCents >= LEVEL_CONFIG.LV3.thresholdCents) return "LV3";
  if (totalSpentCents >= LEVEL_CONFIG.LV2.thresholdCents) return "LV2";
  if (totalSpentCents >= LEVEL_CONFIG.LV1.thresholdCents) return "LV1";
  return "NONE";
}

/** 等级对应折扣率（无等级为 100） */
export function discountRateFor(level: MemberLevel): number {
  return level === "NONE" ? 100 : LEVEL_CONFIG[level].discountRate;
}

/** 整单折扣（四舍五入到分） */
export function applyDiscount(totalCents: number, rate: number): number {
  return Math.round((totalCents * rate) / 100);
}

/** 折扣率文案：98 → "9.8折"，100 → "无折扣" */
export function formatDiscountRate(rate: number): string {
  return rate === 100 ? "无折扣" : `${rate / 10}折`;
}

/** 只升不降：target 高于 current 才生效 */
export function upgradeLevel(current: MemberLevel, target: MemberLevel): MemberLevel {
  return MEMBER_LEVELS.indexOf(target) > MEMBER_LEVELS.indexOf(current) ? target : current;
}

/** 等级中文名 */
export function levelLabel(level: MemberLevel): string {
  return level === "NONE" ? "普通会员" : LEVEL_CONFIG[level].label;
}

/** 支付入账：累加实付金额并计算新等级（等级只升不降）。
 *  返回绝对结果，调用方必须基于事务内读回的最新值使用，不得用请求前缓存的旧值。 */
export function applyPayment(
  current: { totalSpentCents: number; memberLevel: MemberLevel },
  paymentCents: number,
): { totalSpentCents: number; memberLevel: MemberLevel } {
  const totalSpentCents = current.totalSpentCents + paymentCents;
  return {
    totalSpentCents,
    memberLevel: upgradeLevel(current.memberLevel, calcMemberLevel(totalSpentCents)),
  };
}

/** 退款扣回：clamp ≥ 0（账面异常时不为负） */
export function refundSpent(totalSpentCents: number, refundCents: number): number {
  return Math.max(0, totalSpentCents - refundCents);
}
