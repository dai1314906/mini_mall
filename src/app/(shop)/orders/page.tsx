import Link from "next/link";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { requireUser } from "@/lib/auth/session";
import { listOrders } from "@/lib/queries/orders";
import { formatCents } from "@/lib/core/money";

export const metadata = { title: "我的订单" };

export default async function OrdersPage() {
  const user = await requireUser("/orders");
  const orders = await listOrders(user.id);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">我的订单</h1>
      {orders.length === 0 ? (
        <p className="py-16 text-center text-gray-500">还没有订单，去逛逛商品吧</p>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-gray-500">
                  订单号 {o.orderNo} · {o.createdAt.toLocaleString("zh-CN")}
                </span>
                <OrderStatusBadge status={o.status} />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                {o.items.map((i) => `${i.productName} × ${i.quantity}`).join("，")}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-semibold text-red-600">{formatCents(o.totalAmount)}</span>
                <Link href={`/orders/${o.id}`} className="text-sm text-blue-600 hover:underline">
                  查看详情 →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
