import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "后台管理" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 权威权限守卫：覆盖全部 /admin 子路由（每个 action 内部还会二次校验）
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-52 shrink-0 border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4 text-lg font-bold text-blue-600">
          <Link href="/admin">MiniMall 后台</Link>
        </div>
        <nav className="flex flex-col gap-1 p-3 text-sm">
          <Link href="/admin" className="rounded px-3 py-2 hover:bg-gray-100">
            仪表盘
          </Link>
          <Link href="/admin/products" className="rounded px-3 py-2 hover:bg-gray-100">
            商品管理
          </Link>
          <Link href="/admin/categories" className="rounded px-3 py-2 hover:bg-gray-100">
            分类管理
          </Link>
          <Link href="/admin/orders" className="rounded px-3 py-2 hover:bg-gray-100">
            订单管理
          </Link>
        </nav>
        <div className="p-3 text-sm">
          <Link href="/" className="text-gray-500 hover:text-blue-600">
            ← 返回商城
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
