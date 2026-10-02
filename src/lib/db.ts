import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// dev 热更新会重复执行模块，用 globalThis 单例防连接泄漏
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

let pragmasDone = false;

/**
 * 启动时执行一次：WAL 模式（读不阻塞写）+ busy_timeout。
 * WAL 是数据库文件的持久化属性；busy_timeout 属连接级，进程生命周期内覆盖即可。
 * connection_limit=1 单连接下，PRAGMA 与后续查询天然有序。
 * 注意：这两个 PRAGMA 赋值语句都会返回结果行，必须用 $queryRawUnsafe。
 */
export function ensureSqlitePragmas(): void {
  if (pragmasDone) return;
  pragmasDone = true;
  prisma
    .$queryRawUnsafe("PRAGMA journal_mode = WAL")
    .then(() => prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000"))
    .catch((e) => {
      pragmasDone = false; // 失败允许重试
      console.error("[db] PRAGMA 初始化失败:", e);
    });
}

ensureSqlitePragmas();
