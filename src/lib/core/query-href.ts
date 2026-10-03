/** 构建带查询参数的路径：忽略空值；无有效参数时返回 basePath 本身（不拖尾随 ?） */
export function buildQueryHref(basePath: string, params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
