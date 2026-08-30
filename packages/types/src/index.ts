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
