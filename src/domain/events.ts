// ── Domain: Standard Event Envelope ──────────────────────────────────────────
// This is the contract between the Source Service and Kafka.
// Every message published to any Kafka topic follows this exact shape.
// Downstream consumers (Bronze, Dashboard, Alerts) depend on this interface.

export interface StandardEvent {
  /** Deterministic SHA-256 hash — the deduplication key everywhere downstream */
  eventId: string;

  /** Which data source produced this event (e.g. "alphavantage", "polygon") */
  provider: string;

  /** Domain classification (e.g. "market-data", "company-data", "news") */
  dataset: string;

  /** The specific API endpoint that was called (e.g. "TIME_SERIES_INTRADAY") */
  endpoint: string;

  /** Stock ticker symbol (e.g. "AAPL") */
  symbol: string;

  /** ISO8601 timestamp of when the request was initiated */
  requestTime: string;

  /** ISO8601 timestamp of when the response was received and validated */
  receivedTime: string;

  /** The raw, untransformed API response — kept immutable for Bronze layer */
  payload: unknown;
}
