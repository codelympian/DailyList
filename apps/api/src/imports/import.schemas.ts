import { z } from 'zod';
import { TARGET_FIELDS } from '@dailylist/importer';

/** { targetField: sourceHeader } — only known target fields, non-empty headers. */
export const setMappingSchema = z.object({
  mapping: z
    .record(z.enum(TARGET_FIELDS), z.string().trim().min(1).max(200))
    .refine((mapping) => !!mapping.name, { message: 'Map a column to the customer name' })
    .refine(
      (mapping) => {
        const sources = Object.values(mapping);
        return new Set(sources).size === sources.length;
      },
      { message: 'Each file column can only be mapped once' },
    ),
});

export const listImportRowsQuerySchema = z.object({
  status: z
    .enum(['PENDING', 'VALID', 'INVALID', 'DUPLICATE', 'IMPORTED', 'SKIPPED', 'FAILED'])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type SetMappingInput = z.infer<typeof setMappingSchema>;
export type ListImportRowsQuery = z.infer<typeof listImportRowsQuerySchema>;
