import { z } from "zod";

/** 注册表单校验 */
export const registerSchema = z.object({
  name: z.string().trim().min(2, "昵称至少 2 个字符").max(20, "昵称最多 20 个字符"),
  // 先归一化（trim + 小写）再校验格式，否则首尾空格的合法邮箱会被误拒；z.string({error}) 保证非字符串输入也是中文文案
  email: z
    .string({ error: "请输入有效的邮箱地址" })
    .trim()
    .toLowerCase()
    .pipe(z.email("请输入有效的邮箱地址")),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码最多 72 位"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** 登录表单校验 */
export const loginSchema = z.object({
  email: z
    .string({ error: "请输入有效的邮箱地址" })
    .trim()
    .toLowerCase()
    .pipe(z.email("请输入有效的邮箱地址")),
  password: z.string().min(1, "请输入密码"),
});
export type LoginInput = z.infer<typeof loginSchema>;
