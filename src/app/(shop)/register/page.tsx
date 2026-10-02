import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "注册" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-6 text-2xl font-bold">注册</h1>
      <RegisterForm />
    </div>
  );
}
