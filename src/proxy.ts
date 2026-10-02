import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/constants";

/**
 * 轻量 UX 预检（不查数据库）：JWT 中的 role 可能过期，不作为权威判定。
 * 权威校验在 admin/layout.tsx 与每个 admin Server Action 内部。
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const { pathname } = request.nextUrl;

  // 非 ADMIN 拦截 /admin（未登录或普通用户都回首页）
  if (pathname.startsWith("/admin") && payload?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  // 未登录访问购物车/结算/订单 → 登录页带 next
  const protectedPaths = ["/cart", "/checkout", "/orders"];
  if (protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !payload) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cart/:path*", "/checkout/:path*", "/orders/:path*"],
};
