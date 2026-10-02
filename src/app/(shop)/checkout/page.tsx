import { redirect } from "next/navigation";
import CheckoutForm from "@/components/order/CheckoutForm";
import { requireUser } from "@/lib/auth/session";
import { getCartItems } from "@/lib/queries/cart";
import { cartTotals } from "@/lib/core/cart-math";
import {
  applyDiscount,
  discountRateFor,
  formatDiscountRate,
  levelLabel,
  type MemberLevel,
} from "@/lib/core/member";
import { formatCents } from "@/lib/core/money";

export const metadata = { title: "结算" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const items = await getCartItems(user.id);
  const active = items.filter((i) => i.product.isActive);
  if (active.length === 0) redirect("/cart");

  const { totalCents, totalQuantity } = cartTotals(
    active.map((i) => ({ unitPrice: i.product.price, quantity: i.quantity })),
  );
  const rate = discountRateFor(user.memberLevel as MemberLevel);
  const totalAmount = applyDiscount(totalCents, rate);
  const discountCents = totalCents - totalAmount;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h1 className="mb-6 text-xl font-bold">填写收货信息</h1>
        <CheckoutForm />
      </div>
      <div>
        <h2 className="mb-4 text-lg font-bold">订单摘要</h2>
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {active.map((i) => (
            <li key={i.product.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="flex-1 truncate">
                {i.product.name} × {i.quantity}
              </span>
              <span className="text-gray-600">{formatCents(i.product.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>商品原价（{totalQuantity} 件）</span>
            <span>{formatCents(totalCents)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>会员等级</span>
            <span>{levelLabel(user.memberLevel as MemberLevel)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>会员折扣（{formatDiscountRate(rate)}）</span>
            <span className="text-green-600">-{formatCents(discountCents)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
            <span>实付金额</span>
            <span className="text-red-600">{formatCents(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
