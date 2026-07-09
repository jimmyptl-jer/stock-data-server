// ── Provider Factory ─────────────────────────────────────────────────────────
// Returns the correct IProvider implementation based on configuration.
// Adding a new provider = one new class + one new case in this factory.

import { IProvider } from './provider.interface';
import { AlphaVantageProvider } from './alphavantage/provider';

export function createProvider(
  providerName: string,
  apiKey: string,
  baseUrl: string
): IProvider {
  switch (providerName.toLowerCase()) {
    case 'alphavantage':
      return new AlphaVantageProvider(apiKey, baseUrl);

    // Future providers:
    // case 'polygon':
    //   return new PolygonProvider(apiKey, baseUrl);
    // case 'yahoofinance':
    //   return new YahooFinanceProvider(apiKey, baseUrl);

    default:
      throw new Error(`Unknown provider: "${providerName}". Supported: alphavantage`);
  }
}
