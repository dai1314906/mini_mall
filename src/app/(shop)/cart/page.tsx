import Link from "next/link";
import CartTable from "@/components/cart/CartTable";
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

export const metadata = { title: "购物车" };

export default async function CartPage() {
  const user = await requireUser("/cart");
  const items = await getCartItems(user.id);
  const active = items.filter((i) => i.product.isActive);
  const { totalCents, totalQuantity } = cartTotals(
    active.map((i) => ({ unitPrice: i.product.price, quantity: i.quantity })),
  );
  const rate = discountRateFor(user.memberLevel as MemberLevel);
  const payable = applyDiscount(totalCents, rate);
  const discountCents = totalCents - payable;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">购物车</h1>
      {active.length === 0 ? (
        <p className="py-16 text-center text-gray-500">购物车是空的，去挑点喜欢的商品吧</p>
      ) : (
        <>
          <CartTable
            items={active.map((i) => ({
              productId: i.product.id,
              name: i.product.name,
              price: i.product.price,
              stock: i.product.stock,
              image: i.product.image,
              quantity: i.quantity,
            }))}
          />
          <div className="mt-6 flex flex-col items-end gap-2">
            <div className="w-full max-w-sm space-y-1.5 rounded-lg border border-gray-200 bg-white p-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>
                  商品原价（{totalQuantity} 件）
                </span>
                <span>{formatCents(totalCents)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>
                  会员等级 · {levelLabel(user.memberLevel as MemberLevel)}（{formatDiscountRate(rate)}）
                </span>
                <span className="text-green-600">-{formatCents(discountCents)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                <span>预计实付</span>
                <span className="text-red-600">{formatCents(payable)}</span>
              </div>
            </div>
            <Link
              href="/checkout"
              className="rounded bg-red-600 px-6 py-2.5 text-sm text-white hover:bg-red-700"
            >
              去结算
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
