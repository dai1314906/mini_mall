import { notFound } from "next/navigation";
import OrderActionButton from "@/components/order/OrderActionButton";
import OrderAmounts from "@/components/order/OrderAmounts";
import OrderItemsTable from "@/components/order/OrderItemsTable";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import PayPanel from "@/components/order/PayPanel";
import { requireUser } from "@/lib/auth/session";
import { getOrderDetail } from "@/lib/queries/orders";
import { cancelOrder, completeOrder } from "@/lib/actions/order";
import { levelLabel, type MemberLevel } from "@/lib/core/member";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; paid?: string; cancelled?: string; completed?: string; level?: string }>;
}) {
  const user = await requireUser("/orders");
  const { id } = await params;
  const sp = await searchParams;

  const order = await getOrderDetail(Number(id));
  if (!order || order.userId !== user.id) notFound(); // 归属校验：防越权查看他人订单

  const banner = sp.created === "1"
    ? "下单成功！请尽快完成支付。"
    : sp.paid === "1"
      ? sp.level
        ? `支付成功！恭喜升级为${levelLabel(sp.level as MemberLevel)}`
        : "支付成功！"
      : sp.cancelled === "1"
        ? "订单已取消，库存已回补。"
        : sp.completed === "1"
          ? "已确认收货，感谢您的购买！"
          : null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">订单详情</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {banner && (
        <p className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {banner}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
        <p>
          订单号：<span className="text-gray-900">{order.orderNo}</span>
        </p>
        <p className="mt-1">下单时间：{order.createdAt.toLocaleString("zh-CN")}</p>
        <p className="mt-1">
          收货信息：{order.receiverName} · {order.receiverPhone} · {order.receiverAddress}
        </p>
      </div>

      <div className="mt-4">
        <OrderItemsTable items={order.items} />
      </div>

      <div className="mt-4">
        <OrderAmounts
          originalAmount={order.originalAmount}
          discountRate={order.discountRate}
          totalAmount={order.totalAmount}
        />
      </div>

      <div className="mt-4 space-y-3">
        {order.status === "PENDING" && (
          <>
            <PayPanel orderId={order.id} totalAmount={order.totalAmount} />
            <OrderActionButton
              action={cancelOrder}
              orderId={order.id}
              text="取消订单"
              confirmText="确认取消该订单？库存将回补。"
              tone="danger"
            />
          </>
        )}
        {order.status === "SHIPPED" && (
          <OrderActionButton action={completeOrder} orderId={order.id} text="确认收货" />
        )}
      </div>
    </div>
  );
}
