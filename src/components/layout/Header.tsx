import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getCartCount } from "@/lib/queries/cart";
import { levelLabel, type MemberLevel } from "@/lib/core/member";
import { canAccess } from "@/lib/core/guards";
import { logout } from "@/lib/actions/auth";

export default async function Header() {
  const user = await getSession();
  const cartCount = user ? await getCartCount(user.id) : 0;

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-blue-600">
            MiniMall
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="hover:text-blue-600">
              首页
            </Link>
            <Link href="/products" className="hover:text-blue-600">
              全部商品
            </Link>
          </nav>
        </div>
        <form action="/products" method="get" className="flex items-center gap-1">
          <input
            name="q"
            placeholder="搜索商品"
            className="w-36 rounded border border-gray-300 px-2.5 py-1.5 text-sm"
          />
          <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            搜索
          </button>
        </form>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/cart" className="flex items-center gap-1 hover:text-blue-600">
                购物车
                {cartCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
              <Link href="/orders" className="hover:text-blue-600">
                我的订单
              </Link>
              {canAccess(user.role, "ADMIN") && (
                <Link
                  href="/admin"
                  className="rounded border border-blue-600 px-2 py-0.5 text-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  后台管理
                </Link>
              )}
              <span className="text-gray-700">{user.name}</span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                {levelLabel(user.memberLevel as MemberLevel)}
              </span>
              <form action={logout}>
                <button type="submit" className="text-gray-500 hover:text-blue-600">
                  退出
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-blue-600">
                登录
              </Link>
              <Link href="/register" className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
