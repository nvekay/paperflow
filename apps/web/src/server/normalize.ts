export type { Invoice } from '@paperflow/extraction';

/** Letters and digits only, case-folded, for comparing names and numbers that may be printed differently */
export const normText = (s: string | null | undefined) =>
  s
    ? s
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]/gu, '')
    : '';
