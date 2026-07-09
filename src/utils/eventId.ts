import crypto from 'crypto';

/**
 * Generates a deterministic event ID to be used for deduplication.
 * We hash the symbol, endpoint, and requestTime together.
 * 
 * @param symbol The stock symbol (e.g. AAPL)
 * @param endpoint The API endpoint (e.g. TIME_SERIES_INTRADAY)
 * @param requestTime The timestamp of the request in ISO8601 format
 * @returns A SHA-256 hash string (hex format) serving as the unique eventId
 */
export function generateEventId(symbol: string, endpoint: string, requestTime: string): string {
  if (!symbol || !endpoint || !requestTime) {
    throw new Error('symbol, endpoint, and requestTime are required to generate an event ID.');
  }

  // Consistent normalization
  const normalizedSymbol = symbol.trim().toUpperCase();
  const normalizedEndpoint = endpoint.trim().toUpperCase();
  
  // Format the deterministic string
  const input = `${normalizedSymbol}|${normalizedEndpoint}|${requestTime}`;
  
  // Create SHA-256 hash
  return crypto.createHash('sha256').update(input).digest('hex');
}
