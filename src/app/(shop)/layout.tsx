import Header from "@/components/layout/Header";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
        MiniMall 微型电商演示项目 · Next.js 16 + Prisma 5 + SQLite + Tailwind CSS 4
      </footer>
    </div>
  );
}
