// ── Rate Limiter ─────────────────────────────────────────────────────────────
// In-memory counter that tracks API calls made today.
// Hard-stops if the daily budget would be exceeded.
// Resets at midnight UTC.

import { log, LogContext } from '../utils/logger';

export class RateLimiter {
  private callsMade = 0;
  private lastResetDate: string;
  private readonly maxCallsPerDay: number;

  constructor(maxCallsPerDay: number) {
    this.maxCallsPerDay = maxCallsPerDay;
    this.lastResetDate = this.todayUTC();
  }

  /**
   * Checks whether we can make another API call.
   * If we've crossed midnight UTC since the last call, resets the counter.
   * Returns true if the call is allowed, false if budget is exhausted.
   */
  canProceed(context: LogContext): boolean {
    const today = this.todayUTC();

    // Reset counter at midnight UTC
    if (today !== this.lastResetDate) {
      log('RATE_LIMITER', 'SUCCESS', context, {
        message: `New day (${today}). Resetting counter from ${this.callsMade} to 0.`,
      });
      this.callsMade = 0;
      this.lastResetDate = today;
    }

    if (this.callsMade >= this.maxCallsPerDay) {
      log('RATE_LIMITER', 'WARN', context, {
        message: `Daily budget exhausted (${this.callsMade}/${this.maxCallsPerDay}). Skipping.`,
      });
      return false;
    }

    return true;
  }

  /** Records that a call was made. Call this after a successful API request. */
  recordCall(): void {
    this.callsMade++;
  }

  /** Returns the current usage stats. */
  getStats(): { callsMade: number; remaining: number; maxCallsPerDay: number } {
    return {
      callsMade: this.callsMade,
      remaining: this.maxCallsPerDay - this.callsMade,
      maxCallsPerDay: this.maxCallsPerDay,
    };
  }

  private todayUTC(): string {
    return new Date().toISOString().split('T')[0];
  }
}
