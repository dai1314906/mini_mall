import Link from "next/link";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { listAdminOrders } from "@/lib/queries/admin";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/core/order-machine";
import { levelLabel, type MemberLevel } from "@/lib/core/member";
import { formatCents } from "@/lib/core/money";

export const metadata = { title: "订单管理" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? sp.status : undefined;
  const orders = await listAdminOrders(status);

  const tabClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm ${active ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-blue-400"}`;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">订单管理</h1>
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/admin/orders" className={tabClass(!status)}>
          全部
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={tabClass(status === s)}>
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="py-16 text-center text-gray-500">暂无订单</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="p-3">订单号</th>
                <th>买家</th>
                <th>商品</th>
                <th>实付</th>
                <th>状态</th>
                <th>下单时间</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100">
                  <td className="p-3 font-mono text-xs">{o.orderNo}</td>
                  <td>
                    {o.buyerEmail}
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                      {levelLabel(o.buyerLevel as MemberLevel)}
                    </span>
                  </td>
                  <td className="max-w-56 truncate">
                    {o.items.map((i) => `${i.productName} × ${i.quantity}`).join("，")}
                  </td>
                  <td>{formatCents(o.totalAmount)}</td>
                  <td>
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="text-xs text-gray-500">{o.createdAt.toLocaleString("zh-CN")}</td>
                  <td className="text-right">
                    <Link href={`/admin/orders/${o.id}`} className="text-blue-600 hover:underline">
                      详情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
