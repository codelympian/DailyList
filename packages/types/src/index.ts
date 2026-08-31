/**
 * Shared types used across Dailylist apps and packages.
 * Domain types (Customer, Transaction, ...) are added in their phases.
 */

export type ServiceState = 'up' | 'down';

export interface DependencyHealth {
  status: ServiceState;
  latencyMs?: number;
  error?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  dependencies: {
    database: DependencyHealth;
    redis: DependencyHealth;
  };
}

// ============================================================
// Auth + businesses (Phase 1)
// ============================================================

export type MembershipRole = 'OWNER' | 'ADMIN' | 'STAFF';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface BusinessSummary {
  id: string;
  name: string;
  industry: string | null;
  currency: string;
  role: MembershipRole;
}

export interface MeResponse {
  user: AuthUser;
  businesses: BusinessSummary[];
}

export interface AuthResponse {
  user: AuthUser;
}

/** Consistent API error body shape (NestJS-compatible). */
export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error?: string;
  details?: { path: string; message: string }[];
}

// ============================================================
// Customers (Phase 2)
// ============================================================

export type LifecycleStage = 'LEAD' | 'CUSTOMER' | 'INACTIVE' | 'LOST';
export type CustomerSource = 'MANUAL' | 'IMPORT' | 'WHATSAPP' | 'INSTAGRAM' | 'OTHER';
export type IdentityType = 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'INSTAGRAM' | 'EXTERNAL_ID';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lifecycleStage: LifecycleStage;
  tags: string[];
  totalSpend: string; // decimal serialized as string
  purchaseCount: number;
  lastPurchaseAt: string | null;
  createdAt: string;
}

export interface CustomerIdentitySummary {
  id: string;
  type: IdentityType;
  value: string;
}

export interface CustomerDetail extends CustomerSummary {
  notes: string | null;
  source: CustomerSource;
  lastContactedAt: string | null;
  updatedAt: string;
  identities: CustomerIdentitySummary[];
  /** Sum of amount - amountPaid over UNPAID/PARTIALLY_PAID transactions. */
  outstandingDebt: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  payload: Record<string, unknown> | null;
  occurredAt: string;
}

// ============================================================
// Products + transactions (Phase 3)
// ============================================================

export type TransactionStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'REFUNDED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'POS' | 'CARD' | 'OTHER';

export interface ProductSummary {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  price: string;
  costPrice: string | null;
  reorderIntervalDays: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionItemSummary {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

export interface PaymentSummary {
  id: string;
  amount: string;
  method: PaymentMethod;
  occurredAt: string;
}

export interface TransactionSummary {
  id: string;
  customerId: string;
  customerName: string;
  amount: string;
  amountPaid: string;
  amountDue: string;
  status: TransactionStatus;
  occurredAt: string;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  createdAt: string;
}

export interface TransactionDetail extends TransactionSummary {
  items: TransactionItemSummary[];
  payments: PaymentSummary[];
}

// ============================================================
// Leads (Phase 4)
// ============================================================

export type LeadStatus =
  'NEW' | 'CONTACTED' | 'INTERESTED' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST';

export interface LeadSummary {
  id: string;
  customerId: string;
  customerName: string;
  productId: string | null;
  productName: string | null;
  description: string | null;
  status: LeadStatus;
  estimatedValue: string | null;
  notes: string | null;
  lastActivityAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Imports (Phase 5)
// ============================================================

export type ImportStatus =
  'PENDING_MAPPING' | 'VALIDATING' | 'PREVIEW' | 'IMPORTING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ImportRowStatus =
  'PENDING' | 'VALID' | 'INVALID' | 'DUPLICATE' | 'IMPORTED' | 'SKIPPED' | 'FAILED';

export interface ImportJobSummary {
  id: string;
  fileName: string;
  fileType: 'CSV' | 'XLSX';
  status: ImportStatus;
  columns: string[];
  suggestedMapping: Record<string, string>;
  mapping: Record<string, string> | null;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  importedRows: number;
  skippedRows: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ImportRowSummary {
  id: string;
  rowNumber: number;
  raw: Record<string, string>;
  normalized: Record<string, string> | null;
  status: ImportRowStatus;
  errors: { field: string; message: string }[] | null;
  duplicateOfCustomerId: string | null;
}

// ============================================================
// Customer intelligence (Phase 6)
// ============================================================

export type Segment =
  'HOT_LEAD' | 'REORDER_DUE' | 'DEBTOR' | 'LOST_CUSTOMER' | 'REPEAT_CUSTOMER' | 'VIP';

export interface SegmentView {
  segment: Segment;
  reasonCodes: string[];
  /** Human-readable "why", derived from measured data only. */
  reasons: string[];
  facts: Record<string, string | number>;
}

export interface CustomerIntelligenceView {
  customerId: string;
  customerName: string;
  lifecycleStage: LifecycleStage;
  segments: SegmentView[];
  /** False when suppression rules forbid contacting them today. */
  eligible: boolean;
  suppressionCodes: string[];
  suppressionReasons: string[];
  features: {
    purchaseCount: number;
    totalSpend: number;
    outstandingDebt: number;
    daysSinceLastPurchase: number | null;
    daysSinceLastContact: number | null;
    expectedReorderIntervalDays: number | null;
    reorderIntervalSource: string | null;
    daysUntilReorderDue: number | null;
  };
}

export interface SegmentCounts {
  counts: Record<Segment, number>;
  eligibleCounts: Record<Segment, number>;
  totalCustomers: number;
  suppressedCustomers: number;
  computedAt: string;
}

export interface BusinessSettingsResponse {
  businessId: string;
  vipLifetimeSpend: number;
  repeatCustomerMinPurchases: number;
  defaultReorderIntervalDays: number;
  reorderDuePercent: number;
  lostReorderMultiple: number;
  lostCustomerDays: number;
  hotLeadRecencyDays: number;
  minContactIntervalDays: number;
  recentPurchaseSuppressionDays: number;
  /** Top N: how many customers today's list may contain. */
  dailyListSize: number;
  updatedAt: string;
}

/** 409 body when creating/updating a customer collides with an existing identity. */
export interface DuplicateCustomerError extends ApiErrorBody {
  duplicate: {
    customerId: string;
    customerName: string;
    identityType: IdentityType;
    value: string;
  };
}
