import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "@/lib/core/safe-redirect";

describe("sanitizeNextPath 站内重定向净化（修复 I3：开放重定向）", () => {
  it("放行站内相对路径", () => {
    expect(sanitizeNextPath("/products/1")).toBe("/products/1");
    expect(sanitizeNextPath("/cart")).toBe("/cart");
  });

  it("拒绝协议相对路径", () => {
    expect(sanitizeNextPath("//evil.com")).toBe("/");
  });

  it("拒绝反斜杠绕过（/\\evil.com 被 WHATWG 解析为外部域）", () => {
    expect(sanitizeNextPath("/\\evil.com")).toBe("/");
    expect(sanitizeNextPath("/%5Cevil.com")).toBe("/");
  });

  it("拒绝完整外部 URL 与其他协议", () => {
    expect(sanitizeNextPath("https://evil.com")).toBe("/");
    expect(sanitizeNextPath("javascript:alert(1)")).toBe("/");
    expect(sanitizeNextPath("ftp://evil.com")).toBe("/");
  });

  it("空值与纯斜杠回首页", () => {
    expect(sanitizeNextPath("")).toBe("/");
    expect(sanitizeNextPath("/")).toBe("/");
  });
});
