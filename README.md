# 📈 Stock Market Data Platform

A production-grade **Source Data Service** that collects stock market data from external providers, validates responses, and publishes standardized events to Apache Kafka.

Designed as the ingestion layer of a modern financial data platform — provider-agnostic, configuration-driven, and built for scalability.

---

## Architecture

```
                    Scheduler (node-cron)
                         │
                         ▼
                Source Data Service
                         │
                         ▼
                External Data Provider
                  (Alpha Vantage)
                         │
                         ▼
                 Validation Layer
                         │
                         ▼
                   Apache Kafka
                  (Confluent Cloud)
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
      Bronze Consumer  Dashboard   Alerts
         (S3)         Consumer   Consumer
```

> **This repository only contains the Source Data Service.** Consumers (Bronze/S3, Dashboard, Alerts) are built separately in the AWS environment.

---

## Features

- **Provider-Agnostic Design** — Alpha Vantage is just one implementation behind the `IProvider` interface. Swap to Polygon, Yahoo Finance, or IEX by adding a single class.
- **Domain-Driven Kafka Topics** — Each dataset type publishes to its own topic (`stock.market.intraday`, `stock.company.overview`, etc.)
- **Standardized Event Envelope** — Every Kafka message follows the same `StandardEvent` schema regardless of provider or endpoint.
- **Rate Limiting** — In-memory daily call counter that hard-stops before exceeding the API budget. Resets at midnight UTC.
- **Retry with Backoff** — HTTP client retries failed requests 3 times with exponential backoff (1s, 2s, 4s).
- **Endpoint-Specific Validation** — Each Alpha Vantage endpoint has its own required-field checks. Rate limit warnings (`Note`, `Error Message`) are caught before publishing.
- **Structured JSON Logging** — Every log entry includes correlation ID, provider, symbol, endpoint, and status for easy debugging and aggregation.
- **Configuration-Driven** — Symbols, endpoints, intervals, topics, and budgets are all defined in `config.json`. Zero hardcoded values.
- **Graceful Shutdown** — Handles `SIGINT`/`SIGTERM` to stop the scheduler and disconnect Kafka cleanly.

---

## Project Structure

```
stock-data-platform/
├── src/
│   ├── domain/                          # Pure domain models (no dependencies)
│   │   ├── events.ts                    # StandardEvent envelope interface
│   │   └── types.ts                     # ValidationResult, JobDefinition, AppConfig
│   │
│   ├── providers/                       # Data source abstraction
│   │   ├── provider.interface.ts        # IProvider contract
│   │   ├── alphavantage/
│   │   │   ├── client.ts               # HTTP client with retry + backoff
│   │   │   ├── validator.ts            # AV-specific response validation
│   │   │   └── provider.ts            # AlphaVantageProvider (implements IProvider)
│   │   └── index.ts                    # Provider factory
│   │
│   ├── messaging/                       # Kafka integration
│   │   ├── kafka.producer.ts           # KafkaJS producer (SASL_SSL)
│   │   └── topic.resolver.ts           # Endpoint → Kafka topic mapping
│   │
│   ├── scheduler/                       # Job orchestration
│   │   ├── scheduler.ts                # Reads config, dispatches jobs via cron
│   │   └── rate-limiter.ts             # Daily API call budget enforcement
│   │
│   ├── config/                          # Configuration management
│   │   └── index.ts                    # Loads .env + config.json
│   │
│   ├── utils/                           # Shared utilities
│   │   ├── eventId.ts                  # Deterministic SHA-256 event ID hash
│   │   └── logger.ts                   # Structured JSON logger
│   │
│   └── index.ts                         # Application entry point
│
├── scripts/
│   └── budgetCalculator.ts             # API rate budget validation tool
│
├── tests/
│   ├── eventId.test.ts                 # Event ID determinism + edge cases
│   ├── validator.test.ts               # AV validation (18 test cases)
│   └── topicResolver.test.ts           # Topic mapping verification
│
├── config.json                          # Job definitions, topics, budget
├── .env.example                         # Environment variable template
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## Event Schema

Every message published to Kafka follows this envelope:

```json
{
  "eventId": "a]3f8c...deterministic SHA-256 hash",
  "provider": "alphavantage",
  "dataset": "market-data",
  "endpoint": "TIME_SERIES_INTRADAY",
  "symbol": "AAPL",
  "requestTime": "2026-07-09T09:00:00.000Z",
  "receivedTime": "2026-07-09T09:00:01.234Z",
  "payload": { ...raw API response... }
}
```

The `eventId` is a deterministic hash of `symbol + endpoint + requestTime`, used as the deduplication key everywhere downstream.

---

## Kafka Topics

| Endpoint               | Kafka Topic                 |
| ---------------------- | --------------------------- |
| `TIME_SERIES_INTRADAY` | `stock.market.intraday`     |
| `TIME_SERIES_DAILY`    | `stock.market.daily`        |
| `OVERVIEW`             | `stock.company.overview`    |
| `EARNINGS`             | `stock.company.earnings`    |
| `NEWS_SENTIMENT`       | `stock.news`                |

---

## Supported Datasets

| Dataset          | Endpoint               | Frequency  | Priority |
| ---------------- | ---------------------- | ---------- | -------- |
| Intraday Prices  | `TIME_SERIES_INTRADAY` | Every hour | High     |
| Daily Prices     | `TIME_SERIES_DAILY`    | Once/day   | High     |
| Company Overview | `OVERVIEW`             | Weekly     | High     |
| Earnings         | `EARNINGS`             | Weekly     | High     |
| News & Sentiment | `NEWS_SENTIMENT`       | Every hour | Medium   |
| Balance Sheet    | `BALANCE_SHEET`        | Monthly    | Medium   |
| Income Statement | `INCOME_STATEMENT`     | Monthly    | Medium   |
| Cash Flow        | `CASH_FLOW`            | Monthly    | Medium   |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Alpha Vantage API key](https://www.alphavantage.co/support/#api-key)
- A Kafka cluster (e.g. [Confluent Cloud](https://www.confluent.io/confluent-cloud/))

### Installation

```bash
git clone https://github.com/jimmyptl-jer/stock-data-server.git
cd stock-data-server
npm install
```

### Configuration

1. Copy the environment template:

```bash
cp .env.example .env
```

2. Fill in your credentials in `.env`:

```env
ALPHA_VANTAGE_API_KEY=your_api_key_here
KAFKA_BOOTSTRAP_SERVERS=your_broker.confluent.cloud:9092
KAFKA_SASL_USERNAME=your_username
KAFKA_SASL_PASSWORD=your_password
NODE_ENV=development
```

3. Edit `config.json` to customize symbols, polling intervals, and topics.

### Run

```bash
# Start the platform
npm run dev

# Run tests
npm test

# Check API budget
npm run budget
```

---

## Rate Budget Calculator

Before running the platform, validate that your configured jobs won't exceed the API limit:

```bash
npm run budget
```

```
📊 Rate Budget Calculator

API Tier: 500 calls/day, 5 calls/minute

--- Job Breakdown ---
TIME_SERIES_INTRADAY
  Symbols:   7
  Frequency: Every 1h → 24 runs/day
  Cost:      168 calls/day

TIME_SERIES_DAILY
  Symbols:   7
  Frequency: Every 24h → 1 runs/day
  Cost:      7 calls/day

OVERVIEW
  Symbols:   7
  Frequency: Every 168h → 1 runs/day
  Cost:      7 calls/day

EARNINGS
  Symbols:   7
  Frequency: Every 168h → 1 runs/day
  Cost:      7 calls/day

--- Summary ---
Projected: 189 calls/day
Budget:    500 calls/day

✅ Within budget. 311 calls remaining for retries.
```

---

## Adding a New Provider

The system is designed so new data sources can be added without touching any existing code:

1. Create a new directory under `src/providers/` (e.g., `polygon/`)
2. Implement the `IProvider` interface:

```typescript
import { IProvider } from '../provider.interface';
import { StandardEvent } from '../../domain/events';

export class PolygonProvider implements IProvider {
  readonly name = 'polygon';

  async fetch(symbol: string, endpoint: string, dataset: string): Promise<StandardEvent> {
    // Your implementation here
  }
}
```

3. Add a case to the provider factory in `src/providers/index.ts`
4. Update `config.json` to use the new provider name

Everything downstream (Kafka, topic routing, consumers) works unchanged.

---

## Error Handling

| Failure Mode         | Behavior                                           |
| -------------------- | -------------------------------------------------- |
| API unavailable      | Retry 3x with exponential backoff (1s, 2s, 4s)     |
| Rate limit exceeded  | Validation catches `Note`/`Error Message`, no publish |
| Daily budget exhausted | Rate limiter hard-stops, logs warning, skips symbol |
| Invalid JSON         | Validation fails, event is not published            |
| Kafka unavailable    | KafkaJS built-in retry (5 attempts)                 |
| Network timeout      | Caught by retry logic, logged with correlation ID   |

Errors never crash the application. Each symbol is processed independently — one failure doesn't block the rest.

---

## Logging

Every log entry is structured JSON for easy parsing by CloudWatch, Datadog, ELK, etc.:

```json
{
  "timestamp": "2026-07-09T09:00:01.234Z",
  "stage": "KAFKA_PUBLISH",
  "status": "SUCCESS",
  "correlationId": "a1b2c3d4-...",
  "provider": "alphavantage",
  "symbol": "AAPL",
  "dataset": "market-data",
  "endpoint": "TIME_SERIES_INTRADAY",
  "topic": "stock.market.intraday",
  "eventId": "abc123..."
}
```

---

## Tracked Symbols

| Symbol | Company        | Exchange |
| ------ | -------------- | -------- |
| AAPL   | Apple          | NASDAQ   |
| MSFT   | Microsoft      | NASDAQ   |
| NVDA   | NVIDIA         | NASDAQ   |
| AMZN   | Amazon         | NASDAQ   |
| GOOGL  | Alphabet       | NASDAQ   |
| META   | Meta Platforms | NASDAQ   |
| TSLA   | Tesla          | NASDAQ   |

Symbols are configured in `config.json` and can be changed without code modifications.

---

## Roadmap

- [x] **Phase 1** — Source Service + Kafka Producer
- [ ] **Phase 2** — Bronze Consumer → Amazon S3
- [ ] **Phase 3** — Silver Layer (PySpark / Databricks)
- [ ] **Phase 4** — Gold Layer (Aggregated datasets)
- [ ] **Phase 5** — Amazon Athena (SQL queries on S3)
- [ ] **Phase 6** — Amazon Redshift (Data Warehouse)
- [ ] **Phase 7** — BI Dashboards
- [ ] **Phase 8** — Machine Learning Pipelines

---

## Tech Stack

| Component      | Technology                    |
| -------------- | ----------------------------- |
| Runtime        | Node.js + TypeScript          |
| Messaging      | Apache Kafka (Confluent Cloud) |
| Data Provider  | Alpha Vantage API             |
| Scheduler      | node-cron                     |
| Testing        | Jest + ts-jest                |
| Architecture   | Clean Architecture + SOLID    |

---

## Security

- API keys and credentials are loaded from `.env` (never committed)
- `.env` is excluded via `.gitignore`
- Designed for future integration with AWS Secrets Manager
- Kafka connection uses SASL_SSL authentication

---

## License

ISC
