// ── Domain: Shared Types ─────────────────────────────────────────────────────

/** Result of validating a provider's API response */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/** A single scheduled job definition from config.json */
export interface JobDefinition {
  dataset: string;
  endpoint: string;
  intervalHours: number;
  symbols: string[];
}

/** Shape of config.json */
export interface AppConfig {
  api: {
    provider: string;
    baseUrl: string;
    budget: {
      callsPerMinute: number;
      callsPerDay: number;
    };
  };
  kafka: {
    topics: Record<string, string>;
  };
  jobs: JobDefinition[];
}
