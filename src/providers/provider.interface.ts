// ── Provider Interface ───────────────────────────────────────────────────────
// The abstraction that makes the entire platform provider-agnostic.
//
// Every data source (Alpha Vantage, Yahoo Finance, Polygon, IEX, etc.)
// must implement this interface. The scheduler and Kafka producer
// never know which provider they are working with.

import { StandardEvent } from '../domain/events';

export interface IProvider {
  /** Human-readable name of this provider (e.g. "alphavantage") */
  readonly name: string;

  /**
   * Fetch data for a given symbol and endpoint, validate the response,
   * and return a fully formed StandardEvent ready for Kafka publishing.
   *
   * If validation fails, the provider must throw an error — the caller
   * is responsible for catching and logging it.
   */
  fetch(symbol: string, endpoint: string, dataset: string): Promise<StandardEvent>;
}
