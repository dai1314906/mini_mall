import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

describe("registerSchema 注册表单校验", () => {
  it("接受合法输入", () => {
    const r = registerSchema.safeParse({ name: "小明", email: "a@b.com", password: "12345678" });
    expect(r.success).toBe(true);
  });

  it("拒绝非法邮箱", () => {
    expect(registerSchema.safeParse({ name: "小明", email: "not-an-email", password: "12345678" }).success).toBe(false);
  });

  it("拒绝过短密码", () => {
    expect(registerSchema.safeParse({ name: "小明", email: "a@b.com", password: "1234567" }).success).toBe(false);
  });

  it("拒绝过短昵称", () => {
    expect(registerSchema.safeParse({ name: "小", email: "a@b.com", password: "12345678" }).success).toBe(false);
  });
});

describe("loginSchema 登录表单校验", () => {
  it("接受合法输入", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "12345678" }).success).toBe(true);
  });

  it("拒绝空密码", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("拒绝非法邮箱", () => {
    expect(loginSchema.safeParse({ email: "abc", password: "12345678" }).success).toBe(false);
  });
});
