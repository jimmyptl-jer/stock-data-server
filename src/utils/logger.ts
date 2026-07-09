// ── Structured Logger ────────────────────────────────────────────────────────
// Every log entry follows a consistent JSON shape for easy parsing
// by log aggregation tools (CloudWatch, Datadog, ELK, etc.)

import crypto from 'crypto';

export interface LogContext {
  correlationId: string;
  provider?: string;
  symbol?: string;
  dataset?: string;
  endpoint?: string;
}

export function createCorrelationId(): string {
  return crypto.randomUUID();
}

export function log(
  stage: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'ERROR' | 'WARN' | 'SKIPPED',
  context: LogContext,
  details?: Record<string, unknown>
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    stage,
    status,
    ...context,
    ...details,
  };

  if (status === 'ERROR') {
    console.error(JSON.stringify(entry));
  } else if (status === 'WARN') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}
