/** 站内重定向净化（纯函数）：只放行站内相对路径，防开放重定向。
 *  注意反斜杠绕过：WHATWG 对 "/\\evil.com" 的解析等同 "//evil.com"（外部域）。 */

export function sanitizeNextPath(next: string): string {
  // %5C 是反斜杠的百分号编码，浏览器解析 Location 时会解码，同样构成绕过
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.toUpperCase().includes("%5C")) {
    return "/";
  }
  return next;
}
