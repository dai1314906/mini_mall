import { formatDiscountRate } from "@/lib/core/member";
import { formatCents } from "@/lib/core/money";

/** 订单金额块：原价 / 会员折扣 / 实付（前台/后台详情共用） */
export default function OrderAmounts({
  originalAmount,
  discountRate,
  totalAmount,
}: {
  originalAmount: number;
  discountRate: number;
  totalAmount: number;
}) {
  const discountCents = originalAmount - totalAmount;
  return (
    <div className="space-y-1.5 rounded-lg border border-gray-200 bg-white p-4 text-sm">
      <div className="flex justify-between text-gray-600">
        <span>商品原价</span>
        <span>{formatCents(originalAmount)}</span>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>会员折扣（{formatDiscountRate(discountRate)}）</span>
        <span className="text-green-600">-{formatCents(discountCents)}</span>
      </div>
      <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
        <span>实付金额</span>
        <span className="text-red-600">{formatCents(totalAmount)}</span>
      </div>
    </div>
  );
}
