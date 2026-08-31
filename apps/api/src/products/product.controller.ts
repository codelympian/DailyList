import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { BusinessMembership } from '@dailylist/database';
import type { Paginated, ProductSummary } from '@dailylist/types';
import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
  type CreateProductInput,
  type ListProductsQuery,
  type UpdateProductInput,
} from '@dailylist/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import {
  BusinessMemberGuard,
  CurrentMembership,
  RequireRoles,
} from '../businesses/business-member.guard';
import { ProductService } from './product.service';

@Controller('businesses/:businessId/products')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class ProductController {
  constructor(private readonly products: ProductService) {}

  @Post()
  @RequireRoles('OWNER', 'ADMIN')
  create(
    @CurrentMembership() membership: BusinessMembership,
    @Body(new ZodValidationPipe(createProductSchema)) input: CreateProductInput,
  ): Promise<ProductSummary> {
    return this.products.create(membership.businessId, input);
  }

  @Get()
  list(
    @CurrentMembership() membership: BusinessMembership,
    @Query(new ZodValidationPipe(listProductsQuerySchema)) query: ListProductsQuery,
  ): Promise<Paginated<ProductSummary>> {
    return this.products.list(membership.businessId, query);
  }

  @Get(':id')
  get(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ProductSummary> {
    return this.products.get(membership.businessId, id);
  }

  @Patch(':id')
  @RequireRoles('OWNER', 'ADMIN')
  update(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) input: UpdateProductInput,
  ): Promise<ProductSummary> {
    return this.products.update(membership.businessId, id, input);
  }
}
