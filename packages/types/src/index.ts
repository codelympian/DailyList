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

/** 409 body when creating/updating a customer collides with an existing identity. */
export interface DuplicateCustomerError extends ApiErrorBody {
  duplicate: {
    customerId: string;
    customerName: string;
    identityType: IdentityType;
    value: string;
  };
}
