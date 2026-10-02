import { getDashboardStats } from "@/lib/queries/admin";
import { formatCents } from "@/lib/core/money";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "商品总数", value: String(stats.productCount) },
    { label: "订单总数", value: String(stats.orderCount) },
    { label: "待处理订单", value: String(stats.pendingOrders) },
    { label: "注册用户", value: String(stats.userCount) },
    { label: "累计销售额（已支付）", value: formatCents(stats.totalSalesCents) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">仪表盘</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
