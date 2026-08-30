export const HEARTBEAT_QUEUE = 'heartbeat';

export interface HeartbeatJobData {
  requestedAt: string;
}

export interface HeartbeatResult {
  ok: boolean;
  requestedAt: string;
  processedAt: string;
  latencyMs: number;
}

/**
 * Phase 0 proof-of-wiring job handler. Real jobs (import processing,
 * recommendation generation) arrive in their phases and follow this shape:
 * pure, testable functions kept separate from queue plumbing.
 */
export function processHeartbeat(data: HeartbeatJobData, now: Date = new Date()): HeartbeatResult {
  const requested = new Date(data.requestedAt);
  if (Number.isNaN(requested.getTime())) {
    throw new Error('Invalid heartbeat job: requestedAt is not a valid ISO date');
  }
  return {
    ok: true,
    requestedAt: data.requestedAt,
    processedAt: now.toISOString(),
    latencyMs: Math.max(0, now.getTime() - requested.getTime()),
  };
}
