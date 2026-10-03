import { describe, expect, it } from "vitest";
import { makeUniqueSlug, slugify } from "@/lib/core/slug";

describe("slugify 分类 slug 生成", () => {
  it("空串与空白返回空串", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("英文转小写并以连字符连接", () => {
    expect(slugify("Wireless Headphones")).toBe("wireless-headphones");
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("保留数字并剔除标点", () => {
    expect(slugify("iPhone 15 Pro!")).toBe("iphone-15-pro");
  });

  it("纯中文返回空串", () => {
    expect(slugify("数码")).toBe("");
  });

  it("混合中英文剔除中文并压缩连字符", () => {
    expect(slugify("混合 mixed 123")).toBe("mixed-123");
    expect(slugify("a--b")).toBe("a-b");
  });

  it("纯标点返回空串", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("makeUniqueSlug 冲突追加序号", () => {
  it("无冲突返回原值", async () => {
    expect(await makeUniqueSlug("digital", async () => false)).toBe("digital");
  });

  it("冲突一次追加 -2", async () => {
    const exists = async (slug: string) => slug === "digital";
    expect(await makeUniqueSlug("digital", exists)).toBe("digital-2");
  });

  it("连续冲突依次递增", async () => {
    const exists = async (slug: string) => slug === "digital" || slug === "digital-2";
    expect(await makeUniqueSlug("digital", exists)).toBe("digital-3");
  });
});
