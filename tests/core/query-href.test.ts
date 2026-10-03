import { describe, expect, it } from "vitest";
import { buildQueryHref } from "@/lib/core/query-href";

describe("buildQueryHref 查询链接构建", () => {
  it("无参数返回 basePath 本身", () => {
    expect(buildQueryHref("/", {})).toBe("/");
    expect(buildQueryHref("/products", { q: undefined, category: undefined })).toBe("/products");
  });

  it("拼接参数并忽略空值", () => {
    expect(buildQueryHref("/products", { category: "books", q: undefined })).toBe("/products?category=books");
    expect(buildQueryHref("/", { q: "耳机", page: "2" })).toBe("/?q=%E8%80%B3%E6%9C%BA&page=2");
  });
});
