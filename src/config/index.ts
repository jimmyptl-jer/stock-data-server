// ── Configuration ────────────────────────────────────────────────────────────
// Loads .env for secrets and config.json for application settings.
// This is the single source of truth — every module reads from here.

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { AppConfig } from '../domain/types';

dotenv.config();

const configPath = path.resolve(__dirname, '../../config.json');

function loadConfig(): AppConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Configuration file not found at ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8')) as AppConfig;
}

export const config = loadConfig();

// Environment variables (secrets — never in config.json)
export const env = {
  alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY || '',
  kafkaBootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS || '',
  kafkaSaslUsername: process.env.KAFKA_SASL_USERNAME || '',
  kafkaSaslPassword: process.env.KAFKA_SASL_PASSWORD || '',
  nodeEnv: process.env.NODE_ENV || 'development',
};
