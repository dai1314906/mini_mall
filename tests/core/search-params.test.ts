import { describe, expect, it } from "vitest";
import { firstParam, parsePage } from "@/lib/core/search-params";

describe("firstParam searchParams 归一化", () => {
  it("单值原样返回", () => {
    expect(firstParam("digital")).toBe("digital");
  });

  it("重复键数组取第一个", () => {
    expect(firstParam(["a", "b"])).toBe("a");
  });

  it("空值返回 undefined", () => {
    expect(firstParam(undefined)).toBeUndefined();
    expect(firstParam([])).toBeUndefined();
  });
});

describe("parsePage 页码容错", () => {
  it("合法页码", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("缺失与非法回退 1", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
    expect(parsePage("1e999")).toBe(1);
  });

  it("超大页码钳到上限", () => {
    expect(parsePage("999999999")).toBe(100_000);
  });

  it("数组取第一个", () => {
    expect(parsePage(["2", "3"])).toBe(2);
  });
});
