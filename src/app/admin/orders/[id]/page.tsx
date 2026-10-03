import { notFound } from "next/navigation";
import OrderActionButton from "@/components/order/OrderActionButton";
import OrderAmounts from "@/components/order/OrderAmounts";
import OrderItemsTable from "@/components/order/OrderItemsTable";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { getAdminOrderDetail } from "@/lib/queries/orders";
import { adminCompleteOrder, refundOrder, shipOrder } from "@/lib/actions/admin/orders";

export const metadata = { title: "订单详情" };

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ shipped?: string; refunded?: string; completed?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const order = await getAdminOrderDetail(Number(id));
  if (!order) notFound();

  const banner = sp.shipped === "1"
    ? "已发货"
    : sp.refunded === "1"
      ? "已退款，库存已回补，累计消费已扣回"
      : sp.completed === "1"
        ? "已确认收货"
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

      <div className="mt-4 flex gap-3">
        {order.status === "PAID" && (
          <>
            <OrderActionButton action={shipOrder} orderId={order.id} text="发货" />
            <OrderActionButton
              action={refundOrder}
              orderId={order.id}
              text="退款取消"
              confirmText="确认退款取消该订单？库存将回补，买家累计消费将扣回。"
              tone="danger"
            />
          </>
        )}
        {order.status === "SHIPPED" && (
          <OrderActionButton action={adminCompleteOrder} orderId={order.id} text="确认收货" />
        )}
      </div>
    </div>
  );
}
