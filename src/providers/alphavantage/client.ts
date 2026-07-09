// ── Alpha Vantage HTTP Client ────────────────────────────────────────────────
// Pure HTTP client. Makes the API call and returns raw JSON.
// Handles retries with exponential backoff.

import { log, LogContext } from '../../utils/logger';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export class AlphaVantageClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  /**
   * Fetches data from Alpha Vantage with retry logic.
   * Returns the parsed JSON response.
   */
  async request(
    functionName: string,
    symbol: string,
    context: LogContext,
    extraParams: Record<string, string> = {}
  ): Promise<any> {
    const params = new URLSearchParams({
      function: functionName,
      symbol,
      apikey: this.apiKey,
      ...extraParams,
    });

    const url = `${this.baseUrl}?${params.toString()}`;
    const safeUrl = url.replace(this.apiKey, '***');

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        log('API_REQUEST', 'IN_PROGRESS', context, {
          attempt,
          url: safeUrl,
        });

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        log('API_RESPONSE', 'SUCCESS', context, {
          attempt,
          httpStatus: response.status,
        });

        return data;
      } catch (err: any) {
        log('API_REQUEST', 'ERROR', context, {
          attempt,
          error: err.message,
        });

        if (attempt === MAX_RETRIES) {
          throw new Error(
            `Alpha Vantage request failed after ${MAX_RETRIES} attempts: ${err.message}`
          );
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error('Unexpected: exhausted retries without throwing');
  }
}
