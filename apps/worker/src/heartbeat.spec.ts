import { processHeartbeat } from './heartbeat';

describe('processHeartbeat', () => {
  it('processes a valid heartbeat and reports latency', () => {
    const requestedAt = '2026-08-30T08:00:00.000Z';
    const now = new Date('2026-08-30T08:00:01.500Z');

    const result = processHeartbeat({ requestedAt }, now);

    expect(result.ok).toBe(true);
    expect(result.requestedAt).toBe(requestedAt);
    expect(result.processedAt).toBe(now.toISOString());
    expect(result.latencyMs).toBe(1500);
  });

  it('never reports negative latency for clock skew', () => {
    const result = processHeartbeat(
      { requestedAt: '2026-08-30T09:00:00.000Z' },
      new Date('2026-08-30T08:59:59.000Z'),
    );
    expect(result.latencyMs).toBe(0);
  });

  it('rejects invalid job data', () => {
    expect(() => processHeartbeat({ requestedAt: 'not-a-date' })).toThrow(/Invalid heartbeat/);
  });
});
