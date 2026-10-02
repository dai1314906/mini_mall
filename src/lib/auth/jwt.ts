/**
 * Session JWT 签发/验签（jose，HS256）。
 * 纯模块：不依赖 prisma / server-only，proxy.ts 与 Vitest 均可安全引入。
 */
import { SignJWT, jwtVerify } from "jose";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/constants";

export interface SessionTokenPayload {
  sid: string; // Session 行 id
  role: string; // 仅作 proxy 预检用，不作权威判定
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET 未配置或长度不足 32 字节");
  }
  return new TextEncoder().encode(secret);
}

/** 签发会话 token；now 可注入（测试用），默认当前时间 */
export async function signSessionToken(payload: SessionTokenPayload, now = Date.now()): Promise<string> {
  const iat = Math.floor(now / 1000);
  return new SignJWT({ sid: payload.sid, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_MAX_AGE_SECONDS)
    .sign(getSecretKey());
}

/** 验签并返回载荷；签名/过期/字段缺失返回 null，配置错误（密钥缺失/过短）直接抛错 */
export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  const key = getSecretKey(); // 配置错误必须响亮失败，不得静默全员未登录
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.sid !== "string" || typeof payload.role !== "string") return null;
    return { sid: payload.sid, role: payload.role };
  } catch {
    return null;
  }
}
