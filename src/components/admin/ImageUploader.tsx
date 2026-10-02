"use client";

import { useState } from "react";
import { uploadImage } from "@/lib/actions/admin/upload";

/** 图片上传：选图立即上传（与商品表单解耦），URL 填入隐藏字段随表单提交 */
export default function ImageUploader({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("image", file);
    const result = await uploadImage(fd);
    setUploading(false);
    if (result.ok && result.url) setUrl(result.url);
    else setError(result.error ?? "上传失败");
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">商品图片</label>
      <input type="hidden" name="image" value={url} />
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="商品图" className="h-24 w-24 rounded border border-gray-200 object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
            无图片
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          disabled={uploading}
          className="text-sm"
        />
      </div>
      {uploading && <p className="mt-1 text-sm text-gray-500">上传中…</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
