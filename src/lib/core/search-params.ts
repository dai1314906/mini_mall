/**
 * searchParams 工具：App Router 的 searchParams 值可能是 string | string[] | undefined
 * （重复键出现数组），页面层必须先归一化再传入查询层，否则数组会打到 Prisma 报 500。
 */

/** 取值的首个字符串；数组取第一个，空值返回 undefined */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** 页码容错：非法（非数字/小数/非有限数/≤0）回退 1，超过上限钳到上限（防超大 skip） */
export function parsePage(value: string | string[] | undefined, max = 100_000): number {
  const n = Number(firstParam(value));
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, max);
}
