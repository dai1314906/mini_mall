import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { yuanToCents } from "../src/lib/core/money";

const prisma = new PrismaClient();

/** 生成简单的分类配色 SVG 作为种子商品图（生产上传走 UUID 文件名，种子图仅用于演示） */
function makeSvg(name: string, bg: string, fg: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
  <rect width="640" height="480" fill="${bg}"/>
  <text x="320" y="255" font-size="40" fill="${fg}" text-anchor="middle" font-family="system-ui, sans-serif">${name}</text>
</svg>`;
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function main() {
  console.log("开始种子数据初始化…");

  // 幂等：清空重建（演示项目，直接 deleteMany）
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.session.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 账号
  await prisma.user.create({
    data: {
      email: "admin@minimall.com",
      name: "管理员",
      passwordHash: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
    },
  });
  await prisma.user.create({
    data: {
      email: "user@minimall.com",
      name: "演示用户",
      passwordHash: await bcrypt.hash("user123", 10),
    },
  });
  console.log(`账号就绪：admin@minimall.com / admin123，user@minimall.com / user123`);

  // 分类（slug 用于前台 URL 与公开 API 筛选）
  const categoryDefs = [
    { name: "数码", slug: "digital", bg: "#1d4ed8", fg: "#ffffff" },
    { name: "服饰", slug: "fashion", bg: "#be185d", fg: "#ffffff" },
    { name: "食品", slug: "food", bg: "#b45309", fg: "#ffffff" },
    { name: "图书", slug: "books", bg: "#047857", fg: "#ffffff" },
  ];
  const categories = new Map<string, number>();
  for (const c of categoryDefs) {
    const created = await prisma.category.create({ data: { name: c.name, slug: c.slug } });
    categories.set(c.name, created.id);
  }

  // 商品（价格用 yuanToCents 走统一金额入口）
  type ProductSeed = { name: string; desc: string; price: string; stock: number; category: string };
  const products: ProductSeed[] = [
    { name: "无线蓝牙耳机", desc: "主动降噪，续航 30 小时，支持无线充电。", price: "199.00", stock: 50, category: "数码" },
    { name: "智能手表 Pro", desc: "全天候心率监测，50 米防水，两周续航。", price: "899.00", stock: 20, category: "数码" },
    { name: "机械键盘 87 键", desc: "热插拔轴体，PBT 键帽，三模连接。", price: "349.00", stock: 30, category: "数码" },
    { name: "纯棉白 T 恤", desc: "200g 重磅纯棉，圆领基础款，多色可选。", price: "59.00", stock: 100, category: "服饰" },
    { name: "连帽卫衣", desc: "加绒保暖，宽松版型，秋冬百搭。", price: "159.00", stock: 80, category: "服饰" },
    { name: "休闲运动鞋", desc: "轻量缓震，透气网面，日常通勤好选择。", price: "299.00", stock: 40, category: "服饰" },
    { name: "手工曲奇礼盒", desc: "黄油曲奇 500g 礼盒装，酥脆可口。", price: "88.00", stock: 60, category: "食品" },
    { name: "精品挂耳咖啡 20 包", desc: "中度烘焙，五种风味混装。", price: "69.00", stock: 90, category: "食品" },
    { name: "坚果大礼包", desc: "每日坚果 30 日装，独立小包锁鲜。", price: "128.00", stock: 45, category: "食品" },
    { name: "深入浅出 React", desc: "从入门到实战，附完整项目源码。", price: "79.00", stock: 35, category: "图书" },
    { name: "算法导论", desc: "计算机科学经典教材，第 3 版。", price: "109.00", stock: 25, category: "图书" },
    { name: "小王子（精装）", desc: "圣埃克苏佩里经典，中英双语插图本。", price: "32.00", stock: 70, category: "图书" },
  ];

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  for (const [i, p] of products.entries()) {
    const cat = categoryDefs.find((c) => c.name === p.category)!;
    const filename = `seed-${i + 1}.svg`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), makeSvg(p.name, cat.bg, cat.fg), "utf-8");
    await prisma.product.create({
      data: {
        name: p.name,
        description: p.desc,
        price: yuanToCents(p.price),
        stock: p.stock,
        image: `/uploads/${filename}`,
        categoryId: categories.get(p.category)!,
      },
    });
  }

  console.log(`分类 ${categoryDefs.length} 个、商品 ${products.length} 个、种子图 ${products.length} 张已写入。`);
}

main()
  .then(() => console.log("种子数据完成 ✓"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
