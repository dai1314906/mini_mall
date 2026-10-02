"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = { ok: false };

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
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
          className="w-full rounded border border-gray-300 px-3 py-2"
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
        {pending ? "登录中…" : "登录"}
      </button>
      <p className="text-center text-sm text-gray-500">
        还没有账号？{" "}
        <Link href="/register" className="text-blue-600 hover:underline">
          去注册
        </Link>
      </p>
    </form>
  );
}
