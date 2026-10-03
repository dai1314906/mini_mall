import Link from "next/link";
import { buildQueryHref } from "@/lib/core/query-href";

interface Props {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}

export default function Pagination({ page, totalPages, basePath, params }: Props) {
  if (totalPages <= 1) return null;

  const href = (p: number) => buildQueryHref(basePath, { ...params, page: String(p) });

  return (
    <div className="mt-8 flex items-center justify-center gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-100">
          上一页
        </Link>
      ) : (
        <span className="rounded border border-gray-200 px-3 py-1.5 text-gray-300">上一页</span>
      )}
      <span className="text-gray-600">
        第 {page} / {totalPages} 页
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-100">
          下一页
        </Link>
      ) : (
        <span className="rounded border border-gray-200 px-3 py-1.5 text-gray-300">下一页</span>
      )}
    </div>
  );
}
