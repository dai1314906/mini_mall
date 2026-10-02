import "server-only";

import { prisma } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/constants";

export interface ProductListFilters {
  page: number;
  categoryId?: number;
  q?: string;
}

export interface ProductListResult {
  products: {
    id: number;
    name: string;
    description: string;
    price: number;
    stock: number;
    image: string | null;
    categoryId: number;
    categoryName: string;
  }[];
  total: number;
  page: number;
  totalPages: number;
}

/** 前台商品列表：分页 + 分类筛选 + 关键词搜索（仅上架商品） */
export async function listProducts(filters: ProductListFilters): Promise<ProductListResult> {
  const { page, categoryId, q } = filters;
  const keyword = q?.trim();

  const where = {
    isActive: true,
    ...(categoryId ? { categoryId } : {}),
    ...(keyword
      ? { OR: [{ name: { contains: keyword } }, { description: { contains: keyword } }] }
      : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      stock: p.stock,
      image: p.image,
      categoryId: p.categoryId,
      categoryName: p.category.name,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** 前台商品详情（仅上架） */
export async function getProductDetail(id: number) {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price,
    stock: product.stock,
    image: product.image,
    categoryId: product.categoryId,
    categoryName: product.category.name,
  };
}

/** 首页精选：最新上架 8 件 */
export async function listLatestProducts(limit = 8) {
  return listProducts({ page: 1 }).then((r) => r.products.slice(0, limit));
}
