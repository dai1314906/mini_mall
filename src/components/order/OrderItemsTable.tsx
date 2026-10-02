import { formatCents } from "@/lib/core/money";

export interface OrderItemSnapshot {
  id: number;
  productName: string;
  productImage: string | null;
  unitPrice: number;
  quantity: number;
}

/** 订单项表格（前台/后台详情共用；全部来自下单时快照） */
export default function OrderItemsTable({ items }: { items: OrderItemSnapshot[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="p-3">商品</th>
            <th>单价</th>
            <th>数量</th>
            <th className="text-right">小计</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-gray-100">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  {i.productImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.productImage} alt="" className="h-10 w-10 rounded border object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded border bg-gray-100 text-gray-400">
                      {i.productName.slice(0, 1)}
                    </div>
                  )}
                  <span>{i.productName}</span>
                </div>
              </td>
              <td>{formatCents(i.unitPrice)}</td>
              <td>{i.quantity}</td>
              <td className="text-right">{formatCents(i.unitPrice * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
