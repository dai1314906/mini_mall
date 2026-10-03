import "server-only";

import { prisma } from "@/lib/db";
import { PAGE_SIZE } from "@/lib/constants";

export interface ProductListFilters {
  page: number;
  categorySlug?: string;
  q?: string;
  pageSize?: number;
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
    categorySlug: string;
  }[];
  total: number;
  page: number;
  totalPages: number;
}

/** 前台商品列表：分页 + 分类（slug）筛选 + 关键词搜索（仅上架商品）。前台页面与公开 API 共用 */
export async function listProducts(filters: ProductListFilters): Promise<ProductListResult> {
  const { page, categorySlug, q, pageSize = PAGE_SIZE } = filters;
  const keyword = q?.trim();

  const where = {
    isActive: true,
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(keyword
      ? { OR: [{ name: { contains: keyword } }, { description: { contains: keyword } }] }
      : {}),
  };

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
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
      categorySlug: p.category.slug,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** 前台商品详情（仅上架） */
export async function getProductDetail(id: number) {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: { category: { select: { id: true, name: true, slug: true } } },
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
    categorySlug: product.category.slug,
  };
}
