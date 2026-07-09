// ── Alpha Vantage Response Validator ─────────────────────────────────────────
// Provider-specific validation. Each endpoint type has different required fields.
// Downstream code only sees pass/fail — the quirks of Alpha Vantage stay here.

import { ValidationResult } from '../../domain/types';

/**
 * Required response keys per endpoint type.
 * If these keys are missing from the response, validation fails.
 */
const REQUIRED_FIELDS: Record<string, string[]> = {
  TIME_SERIES_INTRADAY: ['Meta Data', 'Time Series (5min)'],
  TIME_SERIES_DAILY: ['Meta Data', 'Time Series (Daily)'],
  TIME_SERIES_WEEKLY: ['Meta Data', 'Weekly Time Series'],
  TIME_SERIES_MONTHLY: ['Meta Data', 'Monthly Time Series'],
  OVERVIEW: ['Symbol', 'Name', 'Exchange'],
  EARNINGS: ['symbol', 'annualEarnings'],
  BALANCE_SHEET: ['symbol', 'annualReports'],
  INCOME_STATEMENT: ['symbol', 'annualReports'],
  CASH_FLOW: ['symbol', 'annualReports'],
  NEWS_SENTIMENT: ['feed'],
};

export function validateResponse(
  data: any,
  endpoint: string
): ValidationResult {
  // 1. Null / empty check
  if (!data || typeof data !== 'object') {
    return { valid: false, reason: 'Empty or non-object response' };
  }

  // 2. Explicit error message from Alpha Vantage
  if (data['Error Message']) {
    return {
      valid: false,
      reason: `API Error: ${data['Error Message']}`,
    };
  }

  // 3. Rate limit note
  if (data['Note']) {
    return {
      valid: false,
      reason: `Rate Limit: ${data['Note']}`,
    };
  }

  // 4. Information field (sometimes contains rate limit text)
  if (
    data['Information'] &&
    typeof data['Information'] === 'string' &&
    data['Information'].toLowerCase().includes('rate limit')
  ) {
    return {
      valid: false,
      reason: `Rate Limit: ${data['Information']}`,
    };
  }

  // 5. Endpoint-specific required fields
  const requiredKeys = REQUIRED_FIELDS[endpoint];
  if (requiredKeys) {
    for (const key of requiredKeys) {
      if (!(key in data)) {
        return {
          valid: false,
          reason: `Missing required field "${key}" for endpoint ${endpoint}`,
        };
      }
    }
  }

  return { valid: true };
}
