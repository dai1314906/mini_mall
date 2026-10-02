"use client";

import { useActionState, useState } from "react";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type AdminActionState,
} from "@/lib/actions/admin/categories";

export interface CategoryRowData {
  id: number;
  name: string;
  productCount: number;
}

const initial: AdminActionState = { ok: false };

export default function CategoryManager({ categories }: { categories: CategoryRowData[] }) {
  const [state, createAction, pending] = useActionState(createCategory, initial);

  return (
    <div className="space-y-6">
      <form action={createAction} className="flex items-end gap-3">
        <div>
          <label htmlFor="new-cat" className="mb-1 block text-sm font-medium">
            新增分类
          </label>
          <input
            id="new-cat"
            name="name"
            required
            maxLength={20}
            className="rounded border border-gray-300 px-3 py-2"
            placeholder="分类名称（最多 20 字）"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "创建中…" : "创建"}
        </button>
      </form>
      {state.fieldErrors?.name?.[0] && <p className="text-sm text-red-600">{state.fieldErrors.name[0]}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">ID</th>
            <th>名称</th>
            <th>商品数</th>
            <th className="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryRow({ category }: { category: CategoryRowData }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  // form action 要求返回 void；删除失败（分类下还有商品）用 alert 提示
  const deleteAction = async (formData: FormData) => {
    const result = await deleteCategory(category.id, formData);
    if (!result.ok && result.error) window.alert(result.error);
  };

  // 事件处理器模式：保存成功才退出编辑模式（避免 effect 内 setState）
  async function handleSave(formData: FormData) {
    setSaving(true);
    setError("");
    setFieldError("");
    const result = await updateCategory(category.id, initial, formData);
    setSaving(false);
    if (result.ok) {
      setEditing(false);
      return;
    }
    if (result.fieldErrors?.name?.[0]) setFieldError(result.fieldErrors.name[0]);
    if (result.error) setError(result.error);
  }

  if (editing) {
    return (
      <tr>
        <td className="py-2">{category.id}</td>
        <td colSpan={2}>
          <form action={handleSave} className="flex items-center gap-2">
            <input
              name="name"
              defaultValue={category.name}
              required
              maxLength={20}
              className="rounded border border-gray-300 px-2 py-1"
            />
            <button type="submit" disabled={saving} className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-60">
              保存
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded border border-gray-300 px-3 py-1">
              取消
            </button>
          </form>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          {fieldError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
        </td>
        <td />
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2">{category.id}</td>
      <td>{category.name}</td>
      <td>{category.productCount}</td>
      <td className="text-right">
        <button onClick={() => setEditing(true)} className="mr-3 text-blue-600 hover:underline">
          编辑
        </button>
        <form
          action={deleteAction}
          className="inline"
          onSubmit={(e) => {
            if (!window.confirm(`确认删除分类「${category.name}」？`)) e.preventDefault();
          }}
        >
          <button type="submit" className="text-red-600 hover:underline">
            删除
          </button>
        </form>
      </td>
    </tr>
  );
}
