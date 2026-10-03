/**
 * 分类 slug 工具：slug 用于前台 URL 与公开 API 分类筛选。
 * 仅保留 ASCII 字母数字，其余字符（含中文）剔除并以连字符压缩。
 */

/** 名称 → slug；纯中文等无可保留字符时返回空串 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 查重后返回唯一 slug：命中则依次追加 -2、-3…（exists 依赖注入，便于直测） */
export async function makeUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}
