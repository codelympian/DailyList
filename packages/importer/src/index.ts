export * from './types';
export * from './columns';
export * from './normalize';
export * from './process';

/** BullMQ queue name shared by the API (producer) and worker (consumer). */
export const IMPORT_QUEUE = 'imports';

export type ImportJobPayload =
  { kind: 'validate'; importJobId: string } | { kind: 'execute'; importJobId: string };

/** Jobs at or below this row count are processed inline by the API. */
export const INLINE_ROW_LIMIT = 500;
