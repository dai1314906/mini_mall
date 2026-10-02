"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = { ok: false };

export default function RegisterForm() {
  const [state, action, pending] = useActionState(register, initialState);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium">
          昵称
        </label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={20}
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder="2~20 个字符"
        />
        {state.fieldErrors?.name?.map((e) => (
          <p key={e} className="mt-1 text-sm text-red-600">
            {e}
          </p>
        ))}
      </div>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium">
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder="you@example.com"
        />
        {state.fieldErrors?.email?.map((e) => (
          <p key={e} className="mt-1 text-sm text-red-600">
            {e}
          </p>
        ))}
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder="至少 8 位"
        />
        {state.fieldErrors?.password?.map((e) => (
          <p key={e} className="mt-1 text-sm text-red-600">
            {e}
          </p>
        ))}
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {pending ? "注册中…" : "注册"}
      </button>
      <p className="text-center text-sm text-gray-500">
        已有账号？{" "}
        <Link href="/login" className="text-blue-600 hover:underline">
          去登录
        </Link>
      </p>
    </form>
  );
}
