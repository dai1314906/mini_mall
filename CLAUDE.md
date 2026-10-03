@AGENTS.md

# MiniMall 微型商城

学习/演示用微型电商：商品浏览与搜索、注册登录、购物车、下单与模拟支付、订单管理、后台管理（商品/分类/订单）、心悦会员等级折扣。详细说明见 [README.md](README.md)，本文件只放协作开发必需的信息。

## 技术架构（分层）

```
页面 / API（app/）→ Server Actions（actions/）→ 领域服务（services/）→ Prisma
                         ↑ 守卫（auth/session）      ↑ 纯函数（core/）+ 校验（validations/）
页面数据读取：app 页面与 API route 直接调 queries/（server-only）
```

- **core/**（`src/lib/core/`）：纯函数层，零依赖，Vitest 直测。money（金额分）、order-machine（状态机）、cart-math、member（会员折扣）、guards（权限）、order-no、slug、safe-redirect、search-params、query-href
- **validations/**（`src/lib/validations/`）：zod schema。表单 schema 允许 `z.coerce`（FormData 字符串）；API JSON schema 用严格类型（`validations/api.ts`，如 `apiAdminProductSchema`、正则 id 校验）
- **queries/**（`src/lib/queries/`）：`server-only` 数据读取，返回映射后的普通对象
- **services/**（`src/lib/services/`）：领域服务，无 `"use server"`（不会注册为远程入口），供 action 与 API route 共用。cart-service（库存 clamp/reject 双语义）、order-service（建单事务/支付/管理员流转）、category-service（slug）
- **actions/**（`src/lib/actions/`）：Server Actions，写入口。流程：守卫（requireUser/requireAdmin）→ zod → service/core → Prisma → revalidatePath → redirect
- **auth/**（`src/lib/auth/`）：自建会话 = jose JWT（仅验签）+ DB Session 行（权威、可撤销）。`session.ts` 提供 getSession/setSession/clearSession/requireUser/requireAdmin；`api-guard.ts` 提供 API 用 JSON 守卫（requireApiUser/requireApiAdmin，勿在 route 里用 redirect 版守卫）
- **api/**（`src/lib/api/`）：`request.ts` readJsonBody（JSON 防御）

## 模块组织

```
src/app/
├─ (shop)/     # 前台：首页(ProductBrowser 浏览区)/products/购物车/结算/orders/登录注册
├─ admin/      # 后台：仪表盘/商品(筛选+分页)/分类/订单（layout requireAdmin 权威守卫）
└─ api/        # REST：products、categories（公开目录）；auth、cart、orders（需登录）；
               #      admin/products、admin/orders、admin/categories（需 ADMIN）
src/components/  # ui(Pagination等) / layout(Header) / product(ProductBrowser/ProductCard) / cart / order / admin / auth
src/proxy.ts    # Next 16 的 middleware 替代：/admin、/cart、/checkout、/orders 的 UX 预检（非权威）
tests/
├─ core/ validations/   # Vitest 纯函数与 zod 直测（不 mock prisma，不测 action/service/route）
└─ e2e/                 # Python + Playwright 冒烟（m6-smoke.py 为全链路）
prisma/  # schema + migrations + seed.ts（幂等重建）
```

## 测试账号（种子数据，seed 重置后恢复）

| 角色 | 邮箱 | 密码 | 入口 |
|---|---|---|---|
| 管理员 | admin@minimall.com | admin123 | /admin 或 Header「后台管理」（仅 ADMIN 可见） |
| 演示用户 | user@minimall.com | user123 | 前台 |

## 常用命令

- `npm run dev` / `build` / `start`；`npm test`（Vitest）；`npm run lint`
- `npx prisma migrate dev`（改 schema 后）；`npm run db:seed`（幂等重置种子，验证后清理测试数据用）；`npm run db:studio`
- E2E：`PYTHONIOENCODING=utf-8 python tests/e2e/m6-smoke.py`（先 seed + 起服务；Windows 控制台需 UTF-8 否则 GBK 编码报错）

## 关键约定

- **金额**：一律整数「分」，进出只经 `core/money.ts`（yuanToCents/formatCents）
- **订单状态机**（`core/order-machine.ts` 纯函数，勿散落判定）：PENDING→PAID→SHIPPED→COMPLETED；用户可取消 PENDING（userCanTransition），管理员可 PAID→SHIPPED/CANCELLED、SHIPPED→COMPLETED（adminCanTransition，API 与 action 双入口同一策略）；取消/退款经 `cancelWithRestock` 回补库存+扣回消费
- **分类 slug**：前台筛选与公开 API 按 slug（`?category=digital`）；admin 创建/改名自动生成（中文名随机兜底，改名重生成，未改名保留）
- **API 约定**：错误体 `{ error, fieldErrors? }` 扁平；400 参数/JSON 非法、401 未登录、403 非 ADMIN、404 不存在或非本人、409 业务冲突（状态机/库存/重复）；成功裸数据、创建 201、删除 204；每个受保护 handler **首行守卫**（`if ("response" in g) return g.response;`）；查询参数取 `sp.get(x) || undefined` 再进 zod
- **Next 16.3.8 特有坑**（与 14/15 不同）：`params`/`searchParams` 是 Promise 必须 `await`（手写类型标注，勿用 RouteContext/PageProps 全局类型——直接 `tsc --noEmit` 找不到）；Route Handler GET 默认不缓存；`revalidateTag` 必须双参数；middleware 改名 proxy；Server Component 直调 Prisma 无需 cache 包装；写 route/迁移前对照 `node_modules/next/dist/docs/`
- **测试纪律**：只测纯层（core/validations），新纯函数/新 schema 先写测试再实现；action/service/route 层改动用 curl 全矩阵 + m6 冒烟回归验证

## 已知取舍

- 公开 API 无鉴权限速（只读目录）；登录时序侧信道未做假哈希比对；注册接口明示"该邮箱已注册"（行业惯例语义）
- 旧书签 `?category=<数字id>` 已失效（slug 化，不做兼容）
- 登录/注册 REST 端点缺 Origin 校验（安全审查发现，见 src/lib/api/request.ts 待补 rejectCrossSite）
