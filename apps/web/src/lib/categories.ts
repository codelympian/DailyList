import { Flame, RefreshCw, Wallet, Moon, type LucideIcon } from 'lucide-react';

/**
 * One definition per recommendation category — icon, wording and tone.
 *
 * Every screen reads from here, so a category always looks and reads the
 * same way. Tone classes are the only place category colour is decided.
 */
export type RecommendationCategory = 'HOT_LEAD' | 'REORDER_DUE' | 'DEBTOR' | 'LOST_CUSTOMER';

export interface CategoryMeta {
  /** Short label for chips and tiles. */
  label: string;
  /** Plural label for counts and headings. */
  plural: string;
  icon: LucideIcon;
  /** Chip background + text. */
  chip: string;
  /** Icon-only tile treatment. */
  tile: string;
  /** One line explaining why this category exists, for empty states and help. */
  meaning: string;
}

export const CATEGORY_META: Record<RecommendationCategory, CategoryMeta> = {
  HOT_LEAD: {
    label: 'Hot lead',
    plural: 'Hot leads',
    icon: Flame,
    chip: 'bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200',
    tile: 'text-orange-600 dark:text-orange-400',
    meaning: 'Asked about something recently but has not bought yet.',
  },
  REORDER_DUE: {
    label: 'Reorder',
    plural: 'Reorders',
    icon: RefreshCw,
    chip: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
    tile: 'text-emerald-600 dark:text-emerald-400',
    meaning: 'Due to buy again based on how often they normally do.',
  },
  DEBTOR: {
    label: 'Unpaid',
    plural: 'Unpaid',
    icon: Wallet,
    chip: 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200',
    tile: 'text-red-600 dark:text-red-400',
    meaning: 'Still owes money on a previous sale.',
  },
  LOST_CUSTOMER: {
    label: 'Reactivate',
    plural: 'Reactivation',
    icon: Moon,
    chip: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    tile: 'text-slate-600 dark:text-slate-300',
    meaning: 'Used to buy regularly and has gone quiet.',
  },
};

/** Display order across the whole product: intent, money, prediction, win-back. */
export const CATEGORY_ORDER: RecommendationCategory[] = [
  'HOT_LEAD',
  'REORDER_DUE',
  'DEBTOR',
  'LOST_CUSTOMER',
];
