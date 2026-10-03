import type { NextRequest } from "next/server";

/** 读取 JSON body；非法 JSON/空 body → 400 Response（调用方直接 return）。body 只能读一次 */
export async function readJsonBody(
  request: NextRequest,
): Promise<{ data: unknown } | { error: Response }> {
  try {
    return { data: await request.json() };
  } catch {
    return { error: Response.json({ error: "请求体必须是合法的 JSON 对象" }, { status: 400 }) };
  }
}
