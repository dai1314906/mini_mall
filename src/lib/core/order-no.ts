/** 订单号生成（纯函数；时钟与随机源注入，测试可确定） */

/** 格式：yyyyMMddHHmmss（14 位）+ 6 位随机数字 */
export function generateOrderNo(now: Date, random: () => string): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  const ts =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${ts}${random().slice(0, 6)}`;
}

/** 生产随机源：6 位数字 */
export function randomDigits(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}
