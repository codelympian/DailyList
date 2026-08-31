import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Product } from '@dailylist/database';
import type { Paginated, ProductSummary } from '@dailylist/types';
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from '@dailylist/validation';
import { PrismaService } from '../prisma/prisma.service';
import { toDecimal } from '../transactions/money';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(businessId: string, input: CreateProductInput): Promise<ProductSummary> {
    try {
      const product = await this.prisma.product.create({
        data: {
          businessId,
          name: input.name,
          sku: input.sku ?? null,
          category: input.category ?? null,
          price: toDecimal(input.price),
          costPrice: input.costPrice !== undefined ? toDecimal(input.costPrice) : null,
          reorderIntervalDays: input.reorderIntervalDays ?? null,
          active: input.active ?? true,
        },
      });
      return toSummary(product);
    } catch (error) {
      throw mapSkuConflict(error);
    }
  }

  async list(businessId: string, query: ListProductsQuery): Promise<Paginated<ProductSummary>> {
    const where: Prisma.ProductWhereInput = { businessId };
    if (query.active !== undefined) where.active = query.active;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { category: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items: items.map(toSummary), total, page: query.page, pageSize: query.pageSize };
  }

  async get(businessId: string, productId: string): Promise<ProductSummary> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
    });
    if (!product) throw new NotFoundException('Product not found');
    return toSummary(product);
  }

  async update(
    businessId: string,
    productId: string,
    input: UpdateProductInput,
  ): Promise<ProductSummary> {
    await this.get(businessId, productId);
    try {
      const product = await this.prisma.product.update({
        where: { id: productId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sku !== undefined ? { sku: input.sku ?? null } : {}),
          ...(input.category !== undefined ? { category: input.category ?? null } : {}),
          ...(input.price !== undefined ? { price: toDecimal(input.price) } : {}),
          ...(input.costPrice !== undefined ? { costPrice: toDecimal(input.costPrice) } : {}),
          ...(input.reorderIntervalDays !== undefined
            ? { reorderIntervalDays: input.reorderIntervalDays }
            : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
      return toSummary(product);
    } catch (error) {
      throw mapSkuConflict(error);
    }
  }
}

function toSummary(product: Product): ProductSummary {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price.toFixed(2),
    costPrice: product.costPrice?.toFixed(2) ?? null,
    reorderIntervalDays: product.reorderIntervalDays,
    active: product.active,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function mapSkuConflict(error: unknown): unknown {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    return new ConflictException('A product with this SKU already exists');
  }
  return error;
}
