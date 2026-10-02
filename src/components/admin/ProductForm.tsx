"use client";

import Link from "next/link";
import { useActionState } from "react";
import ImageUploader from "@/components/admin/ImageUploader";
import { createProduct, updateProduct, type AdminActionState } from "@/lib/actions/admin/products";

export interface ProductFormData {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  image: string | null;
}

interface Props {
  categories: { id: number; name: string }[];
  product?: ProductFormData | null;
}

const initial: AdminActionState = { ok: false };

export default function ProductForm({ categories, product }: Props) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, formAction, pending] = useActionState(action, initial);
  // 金额以「元」字符串编辑，提交时经 yuanToCents 转分
  const priceYuan = product ? (product.price / 100).toFixed(2) : "";

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          商品名称
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={50}
          defaultValue={product?.name}
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
        {state.fieldErrors?.name?.[0] && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name[0]}</p>}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          商品描述
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={product?.description}
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
        {state.fieldErrors?.description?.[0] && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className="mb-1 block text-sm font-medium">
            价格（元）
          </label>
          <input
            id="price"
            name="price"
            required
            inputMode="decimal"
            defaultValue={priceYuan}
            placeholder="如 199.00"
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
          {state.fieldErrors?.price?.[0] && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.price[0]}</p>}
        </div>
        <div>
          <label htmlFor="stock" className="mb-1 block text-sm font-medium">
            库存
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            required
            min={0}
            defaultValue={product?.stock ?? 0}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
          {state.fieldErrors?.stock?.[0] && <p className="mt-1 text-sm text-red-600">{state.fieldErrors.stock[0]}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="categoryId" className="mb-1 block text-sm font-medium">
          分类
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={product?.categoryId ?? ""}
          className="w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="" disabled>
            请选择分类
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.categoryId?.[0] && (
          <p className="mt-1 text-sm text-red-600">{state.fieldErrors.categoryId[0]}</p>
        )}
      </div>

      <ImageUploader initialUrl={product?.image ?? ""} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "保存中…" : "保存"}
        </button>
        <Link href="/admin/products" className="rounded border border-gray-300 px-5 py-2 text-gray-600 hover:bg-gray-100">
          取消
        </Link>
      </div>
    </form>
  );
}
