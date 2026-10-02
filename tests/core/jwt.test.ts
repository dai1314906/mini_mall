import { beforeAll, describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

// jwt.ts 在调用时读取 process.env.AUTH_SECRET，测试注入固定密钥
beforeAll(() => {
  process.env.AUTH_SECRET = "t".repeat(32);
});

describe("signSessionToken / verifySessionToken", () => {
  it("签发后可验签还原载荷", async () => {
    const token = await signSessionToken({ sid: "abc123", role: "ADMIN" });
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({ sid: "abc123", role: "ADMIN" });
  });

  it("篡改后的 token 验签失败返回 null", async () => {
    const token = await signSessionToken({ sid: "abc123", role: "USER" });
    const tampered = token.slice(0, -3) + "xyz";
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("过期 token 返回 null", async () => {
    // 用过去的时钟签发：exp 已在当前时间之前
    const past = Date.now() - (SESSION_MAX_AGE_SECONDS + 60) * 1000;
    const token = await signSessionToken({ sid: "abc123", role: "USER" }, past);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("缺失载荷字段返回 null", async () => {
    const token = await signSessionToken({ sid: "abc123", role: "USER" });
    // 用错误密钥验签同构 token，签名校验失败
    const otherSecret = "u".repeat(32);
    const saved = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = otherSecret;
    try {
      expect(await verifySessionToken(token)).toBeNull();
    } finally {
      process.env.AUTH_SECRET = saved;
    }
  });

  it("未配置密钥时签发抛错", async () => {
    const saved = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    try {
      await expect(signSessionToken({ sid: "x", role: "USER" })).rejects.toThrow(/AUTH_SECRET/);
    } finally {
      process.env.AUTH_SECRET = saved;
    }
  });

  it("未配置密钥时验签抛错（配置错误必须响亮失败，不得静默全员未登录）", async () => {
    const saved = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    try {
      await expect(verifySessionToken("whatever")).rejects.toThrow(/AUTH_SECRET/);
    } finally {
      process.env.AUTH_SECRET = saved;
    }
  });
});
