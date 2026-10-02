"use server";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/auth/session";
import { UPLOAD_DIR, UPLOAD_MAX_BYTES } from "@/lib/constants";

/** 扩展名白名单（以 MIME 为准，不看原始文件名） */
const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** 商品图片上传：仅 ADMIN，UUID 文件名防路径穿越/冲突，写入 public/uploads */
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  await requireAdmin("/admin/products/new");

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "请选择图片" };
  if (file.size > UPLOAD_MAX_BYTES) return { ok: false, error: "图片不能超过 2MB" };
  const ext = ALLOWED.get(file.type);
  if (!ext) return { ok: false, error: "仅支持 JPG/PNG/WebP/GIF 格式" };

  const filename = randomUUID() + ext;
  const uploadDir = path.join(process.cwd(), UPLOAD_DIR);
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  return { ok: true, url: `/uploads/${filename}` };
}
