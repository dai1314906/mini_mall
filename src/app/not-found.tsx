import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <p className="text-6xl font-bold text-gray-300">404</p>
      <h1 className="mt-4 text-xl font-bold">页面不存在</h1>
      <p className="mt-2 text-gray-500">您访问的页面不存在或无权查看</p>
      <Link href="/" className="mt-6 rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
        返回首页
      </Link>
    </div>
  );
}
