# MiniMall 微型商城

学习/演示用微型电商项目：商品浏览与搜索、用户注册登录、购物车、下单与模拟支付、订单管理、后台管理（商品/分类/订单），并内置心悦会员等级折扣体系。

## 技术栈

| 技术 | 版本 |
|---|---|
| Next.js（App Router + Turbopack） | 16.3.8 |
| React | 19.3.0 |
| TypeScript | 5.9.3 |
| Prisma | 5.22.0（经典引擎 + SQLite） |
| Tailwind CSS | 4.3.3 |
| zod / bcryptjs / jose | 4.6.5 / 3.0.3 / 6.2.12 |
| Vitest | 5.0.3 |

## 快速开始

```bash
npm install
# 1. 配置环境变量：复制 .env.example 为 .env 并填入 AUTH_SECRET
#    （生成命令：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"）
# 2. 建库并写入种子数据
npx prisma migrate dev
npm run db:seed
# 3. 启动
npm run dev
```

访问 http://localhost:3000

## 演示账号（种子数据）

| 角色 | 邮箱 | 密码 | 入口 |
|---|---|---|---|
| 管理员 | admin@minimall.com | admin123 | /admin |
| 演示用户 | user@minimall.com | user123 | 前台 |

## 心悦会员体系

| 等级 | 累计消费（支付成功订单实付） | 后续订单折扣 |
|---|---|---|
| 心悦1级 | ≥ 8,000 元 | 9.8 折 |
| 心悦2级 | ≥ 80,000 元 | 9.5 折 |
| 心悦3级 | ≥ 800,000 元 | 9 折 |

- 下单时按当前等级对整单打折，折扣率快照进订单（订单详情展示「原价/会员折扣/实付」）
- 支付成功即累计，退款取消扣回；**等级只升不降**

## 常用脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` / `build` / `start` | 开发 / 生产构建 / 生产运行 |
| `npm test` | Vitest 单元测试（核心纯逻辑） |
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run db:seed` | 重置并写入种子数据（幂等） |
| `npm run db:reset` | 重置数据库并重新 seed |
| `npm run db:studio` | 打开 Prisma Studio 查看数据 |
| `npm run verify:tx` | 事务回滚验证实验 |

E2E 冒烟脚本位于 `tests/e2e/`（Python + Playwright）：`auth-e2e.py`（认证）、`m2-e2e.py`（商品分类）、`m3-e2e.py`（购物车）、`m4-e2e.py`（下单支付会员）、`m5-e2e.py`（后台订单权限）、`m6-smoke.py`（生产模式全链路）。运行前先 `npm run db:seed` 重置数据。

## 架构

```
src/
├─ app/
│  ├─ (shop)/        # 前台：首页/商品列表/详情/购物车/结算/订单/登录注册
│  └─ admin/         # 后台：仪表盘/商品/分类/订单（layout 权威权限守卫）
├─ components/       # ui / layout / product / cart / order / admin / auth
└─ lib/
   ├─ core/          # ★ 纯函数层（零依赖）：money/order-machine/member/cart-math/guards/order-no
   ├─ validations/   # zod schema（纯模块）
   ├─ auth/          # 自建 Session：jose JWT + 数据库 session 行（可撤销）
   ├─ queries/       # 数据读取（server-only）
   ├─ actions/       # Server Actions（守卫→校验→core→Prisma→revalidate）
   └─ db.ts          # Prisma 单例 + SQLite WAL（connection_limit=1）
```

- **三层解耦**：core（纯函数）→ queries/auth（读）→ actions（写入口）；core 层被 Vitest 直测
- **认证**：bcryptjs 哈希 + jose 签名 httpOnly Cookie + DB Session 行；`src/proxy.ts` 做轻量 UX 预检，权威校验在 admin/layout 与每个 admin action
- **下单原子性**：`prisma.$transaction` 内完成「核库存 → 扣库存 → 建订单（快照）→ 建订单项 → 清购物车」
- **金额**：一律整数「分」存储，进出只经 `core/money.ts`
- **订单状态机**：待支付 → 已支付 → 已发货 → 已完成；取消/退款回补库存（`core/order-machine.ts` 纯函数流转矩阵）
