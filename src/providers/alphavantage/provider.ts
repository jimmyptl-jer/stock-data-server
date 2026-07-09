// ── Alpha Vantage Provider ───────────────────────────────────────────────────
// Implements the IProvider interface.
// Orchestrates: client.request() → validate() → wrap in StandardEvent

import { IProvider } from '../provider.interface';
import { StandardEvent } from '../../domain/events';
import { AlphaVantageClient } from './client';
import { validateResponse } from './validator';
import { generateEventId } from '../../utils/eventId';
import { log, LogContext, createCorrelationId } from '../../utils/logger';

/**
 * Extra query parameters that certain Alpha Vantage endpoints require.
 */
const ENDPOINT_PARAMS: Record<string, Record<string, string>> = {
  TIME_SERIES_INTRADAY: { interval: '5min' },
};

export class AlphaVantageProvider implements IProvider {
  readonly name = 'alphavantage';
  private readonly client: AlphaVantageClient;

  constructor(apiKey: string, baseUrl: string) {
    this.client = new AlphaVantageClient(apiKey, baseUrl);
  }

  async fetch(
    symbol: string,
    endpoint: string,
    dataset: string
  ): Promise<StandardEvent> {
    const correlationId = createCorrelationId();
    const context: LogContext = {
      correlationId,
      provider: this.name,
      symbol,
      dataset,
      endpoint,
    };

    const requestTime = new Date().toISOString();
    log('JOB_START', 'PENDING', context);

    // 1. Fetch from Alpha Vantage
    const extraParams = ENDPOINT_PARAMS[endpoint] || {};
    const data = await this.client.request(endpoint, symbol, context, extraParams);

    // 2. Validate
    log('VALIDATION', 'IN_PROGRESS', context);
    const validation = validateResponse(data, endpoint);

    if (!validation.valid) {
      log('VALIDATION', 'ERROR', context, { reason: validation.reason });
      throw new Error(`Validation failed for ${symbol}/${endpoint}: ${validation.reason}`);
    }

    log('VALIDATION', 'SUCCESS', context);

    // 3. Wrap in StandardEvent
    const receivedTime = new Date().toISOString();
    const eventId = generateEventId(symbol, endpoint, requestTime);

    const event: StandardEvent = {
      eventId,
      provider: this.name,
      dataset,
      endpoint,
      symbol: symbol.toUpperCase(),
      requestTime,
      receivedTime,
      payload: data,
    };

    log('EVENT_CREATED', 'SUCCESS', context, { eventId });
    return event;
  }
}
