import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { BusinessMembership, User } from '@dailylist/database';
import type { ImportJobSummary, ImportRowSummary, Paginated } from '@dailylist/types';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  BusinessMemberGuard,
  CurrentMembership,
  RequireRoles,
} from '../businesses/business-member.guard';
import { ImportService } from './import.service';
import {
  listImportRowsQuerySchema,
  setMappingSchema,
  type ListImportRowsQuery,
  type SetMappingInput,
} from './import.schemas';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

@Controller('businesses/:businessId/imports')
@UseGuards(SessionAuthGuard, BusinessMemberGuard)
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Post()
  @RequireRoles('OWNER', 'ADMIN')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES } }))
  upload(
    @CurrentMembership() membership: BusinessMembership,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ImportJobSummary> {
    if (!file) throw new BadRequestException('Attach a file field named "file"');
    return this.imports.upload(membership.businessId, user.id, file);
  }

  @Get()
  list(
    @CurrentMembership() membership: BusinessMembership,
    @Query(new ZodValidationPipe(listImportRowsQuerySchema)) query: ListImportRowsQuery,
  ): Promise<Paginated<ImportJobSummary>> {
    return this.imports.list(membership.businessId, query.page, query.pageSize);
  }

  @Get(':id')
  get(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ImportJobSummary> {
    return this.imports.get(membership.businessId, id);
  }

  @Post(':id/mapping')
  @HttpCode(200)
  @RequireRoles('OWNER', 'ADMIN')
  setMapping(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(new ZodValidationPipe(setMappingSchema)) input: SetMappingInput,
  ): Promise<ImportJobSummary> {
    return this.imports.setMapping(membership.businessId, id, input);
  }

  @Post(':id/confirm')
  @HttpCode(200)
  @RequireRoles('OWNER', 'ADMIN')
  confirm(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ImportJobSummary> {
    return this.imports.confirm(membership.businessId, id);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequireRoles('OWNER', 'ADMIN')
  cancel(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ImportJobSummary> {
    return this.imports.cancel(membership.businessId, id);
  }

  @Get(':id/rows')
  rows(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query(new ZodValidationPipe(listImportRowsQuerySchema)) query: ListImportRowsQuery,
  ): Promise<Paginated<ImportRowSummary>> {
    return this.imports.rows(membership.businessId, id, query);
  }

  @Get(':id/error-report')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="import-errors.csv"')
  errorReport(
    @CurrentMembership() membership: BusinessMembership,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<string> {
    return this.imports.errorReport(membership.businessId, id);
  }
}
