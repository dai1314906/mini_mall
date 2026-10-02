/**
 * 金额工具：全站金额进出只经这两个函数，杜绝浮点误差。
 * 存储单位为「分」（Int）。
 */

const YUAN_RE = /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/;

/** 元字符串 → 分；非法输入抛错（非负、最多两位小数、整数部分上限 8 位） */
export function yuanToCents(yuan: string): number {
  const s = yuan.trim();
  if (!YUAN_RE.test(s)) {
    throw new Error(`非法金额：${yuan}`);
  }
  const [intPart, decPart = ""] = s.split(".");
  return Number(intPart) * 100 + Number((decPart + "00").slice(0, 2));
}

/** 分 → 显示字符串，如 1234 → "¥12.34" */
export function formatCents(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const yuan = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${cents < 0 ? "-" : ""}¥${yuan.toLocaleString("en-US")}.${frac}`;
}
