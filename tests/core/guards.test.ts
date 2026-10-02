import { describe, expect, it } from "vitest";
import { canAccess, ROLES } from "@/lib/core/guards";

describe("canAccess 角色权限判定", () => {
  it("未登录用户不能访问任何受保护资源", () => {
    expect(canAccess(null, "USER")).toBe(false);
    expect(canAccess(null, "ADMIN")).toBe(false);
  });

  it("USER 只能访问 USER 资源", () => {
    expect(canAccess("USER", "USER")).toBe(true);
    expect(canAccess("USER", "ADMIN")).toBe(false);
  });

  it("ADMIN 可访问 USER 与 ADMIN 资源", () => {
    expect(canAccess("ADMIN", "USER")).toBe(true);
    expect(canAccess("ADMIN", "ADMIN")).toBe(true);
  });

  it("角色全集为 USER 与 ADMIN", () => {
    expect(ROLES).toEqual(["USER", "ADMIN"]);
  });
});
