/**
 * M0 验证实验：确认 Prisma 5.22 经典引擎 + SQLite 的交互式事务
 * 在抛错时正确回滚（下单原子性依赖此能力）。
 * 运行：npm run verify:tx
 */
import { prisma } from "../src/lib/db";

async function main() {
  const email = `tx-test-${Date.now()}@minimall.com`;
  let sessionId = "";
  let rolledBack = false;

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: "事务实验", passwordHash: "x" },
      });
      sessionId = `tx-${user.id}-${Date.now()}`;
      await tx.session.create({
        data: { id: sessionId, userId: user.id, expiresAt: new Date(Date.now() + 1000) },
      });
      throw new Error("故意抛错，验证 ROLLBACK");
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("故意抛错")) rolledBack = true;
    else throw e;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const session = await prisma.session.findUnique({ where: { id: sessionId } });

  if (rolledBack && !user && !session) {
    console.log("✓ 回滚实验通过：事务内的 user + session 写入均已回滚");
  } else {
    console.error("✗ 回滚实验失败：事务内写入未被回滚", { rolledBack, user, session });
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
