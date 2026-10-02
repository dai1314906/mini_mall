import { STATUS_LABELS, type OrderStatus } from "@/lib/core/order-machine";

const COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PAID: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  SHIPPED: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
};

export default function OrderStatusBadge({ status }: { status: string }) {
  const s = (status in STATUS_LABELS ? status : "PENDING") as OrderStatus;
  return <span className={`rounded px-2 py-0.5 text-xs ${COLORS[s]}`}>{STATUS_LABELS[s]}</span>;
}
