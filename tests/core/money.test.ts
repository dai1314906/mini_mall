import { describe, expect, it } from "vitest";
import { formatCents, yuanToCents } from "@/lib/core/money";

describe("yuanToCents", () => {
  it("把元字符串转成分", () => {
    expect(yuanToCents("12.34")).toBe(1234);
    expect(yuanToCents("0.01")).toBe(1);
    expect(yuanToCents("100")).toBe(10000);
    expect(yuanToCents("1.5")).toBe(150);
  });

  it("拒绝非法输入", () => {
    expect(() => yuanToCents("abc")).toThrow();
    expect(() => yuanToCents("1.234")).toThrow();
    expect(() => yuanToCents("-1")).toThrow();
    expect(() => yuanToCents("")).toThrow();
    expect(() => yuanToCents("1,000")).toThrow();
  });

  it("处理边界", () => {
    expect(yuanToCents("0")).toBe(0);
    expect(yuanToCents("99999999.99")).toBe(9999999999);
  });
});

describe("formatCents", () => {
  it("把分格式化为元字符串", () => {
    expect(formatCents(1234)).toBe("¥12.34");
    expect(formatCents(0)).toBe("¥0.00");
    expect(formatCents(5)).toBe("¥0.05");
    expect(formatCents(9999999999)).toBe("¥99,999,999.99");
  });
});
