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
