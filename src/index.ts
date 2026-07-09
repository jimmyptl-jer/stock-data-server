// ── Application Entry Point ──────────────────────────────────────────────────
// Bootstraps the entire Source Data Service:
//   1. Load configuration
//   2. Initialize provider (via factory)
//   3. Connect Kafka producer
//   4. Start scheduler
//   5. Graceful shutdown on SIGINT / SIGTERM

import { config, env } from './config';
import { createProvider } from './providers';
import { KafkaProducer } from './messaging/kafka.producer';
import { TopicResolver } from './messaging/topic.resolver';
import { Scheduler } from './scheduler/scheduler';
import { RateLimiter } from './scheduler/rate-limiter';

async function main(): Promise<void> {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════════╗');
  console.log('  ║                                                           ║');
  console.log('  ║   📈  Stock Market Data Platform  v1.0                    ║');
  console.log('  ║   Source Data Service                                     ║');
  console.log('  ║                                                           ║');
  console.log('  ╟───────────────────────────────────────────────────────────╢');

  // 1. Validate required environment variables
  if (!env.alphaVantageApiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not set in .env');
  }
  if (!env.kafkaBootstrapServers) {
    throw new Error('KAFKA_BOOTSTRAP_SERVERS is not set in .env');
  }

  // 2. Initialize provider
  const provider = createProvider(
    config.api.provider,
    env.alphaVantageApiKey,
    config.api.baseUrl
  );
  console.log(`  ║   🔌  Provider:   ${provider.name.padEnd(38)} ║`);

  // 3. Connect Kafka
  const kafka = new KafkaProducer(
    env.kafkaBootstrapServers,
    env.kafkaSaslUsername,
    env.kafkaSaslPassword
  );
  await kafka.connect();
  console.log(`  ║   📡  Kafka:      Connected to Confluent Cloud           ║`);

  // 4. Initialize topic resolver & rate limiter
  const topicResolver = new TopicResolver(config.kafka.topics);
  const rateLimiter = new RateLimiter(config.api.budget.callsPerDay);
  console.log(`  ║   💰  Budget:     ${config.api.budget.callsPerDay} calls/day${' '.repeat(27)}║`);

  // 5. Start scheduler
  const scheduler = new Scheduler(
    provider,
    kafka,
    topicResolver,
    rateLimiter,
    config.jobs
  );

  console.log('  ║                                                           ║');
  console.log('  ╟───────────────────────────────────────────────────────────╢');
  console.log('  ║   📅  Scheduled Jobs                                      ║');

  scheduler.start();

  console.log('  ║                                                           ║');
  console.log('  ╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // 6. Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n  Received ${signal}. Shutting down gracefully...`);
    scheduler.stop();
    await kafka.disconnect();
    console.log('  ✅  Clean shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('💥 Fatal startup error:', err.message);
  process.exit(1);
});
