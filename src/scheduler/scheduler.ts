// ── Scheduler ────────────────────────────────────────────────────────────────
// Reads job definitions from config.json.
// For each job, iterates over symbols, checks the rate limiter,
// calls the provider, and publishes the event to Kafka.
//
// Uses node-cron for recurring execution.
// The scheduler never writes to S3 or any storage — only Kafka.

import cron, { ScheduledTask } from 'node-cron';
import { IProvider } from '../providers/provider.interface';
import { KafkaProducer } from '../messaging/kafka.producer';
import { TopicResolver } from '../messaging/topic.resolver';
import { RateLimiter } from './rate-limiter';
import { JobDefinition } from '../domain/types';
import { log, createCorrelationId, LogContext } from '../utils/logger';

export class Scheduler {
  private readonly provider: IProvider;
  private readonly kafka: KafkaProducer;
  private readonly topicResolver: TopicResolver;
  private readonly rateLimiter: RateLimiter;
  private readonly jobs: JobDefinition[];
  private readonly tasks: ScheduledTask[] = [];

  constructor(
    provider: IProvider,
    kafka: KafkaProducer,
    topicResolver: TopicResolver,
    rateLimiter: RateLimiter,
    jobs: JobDefinition[]
  ) {
    this.provider = provider;
    this.kafka = kafka;
    this.topicResolver = topicResolver;
    this.rateLimiter = rateLimiter;
    this.jobs = jobs;
  }

  /**
   * Starts all scheduled jobs based on their configured intervalHours.
   * Also runs each job once immediately on startup.
   */
  start(): void {
    for (const job of this.jobs) {
      const cronExpr = this.intervalToCron(job.intervalHours);

      console.log(
        `  📅  Scheduled: ${job.endpoint} (${job.symbols.length} symbols) → every ${job.intervalHours}h [${cronExpr}]`
      );

      // Run once immediately on startup
      this.executeJob(job);

      // Then schedule recurring
      const task = cron.schedule(cronExpr, () => {
        this.executeJob(job);
      });

      this.tasks.push(task);
    }
  }

  /** Stops all scheduled tasks. */
  stop(): void {
    for (const task of this.tasks) {
      task.stop();
    }
    this.tasks.length = 0;
    console.log('  🛑  Scheduler stopped.');
  }

  /**
   * Executes a single job: iterates symbols, fetches, validates, publishes.
   * Each symbol is processed independently — one failure doesn't block the rest.
   */
  private async executeJob(job: JobDefinition): Promise<void> {
    const batchCorrelationId = createCorrelationId();
    const topic = this.topicResolver.resolve(job.endpoint);

    log('BATCH_START', 'PENDING', {
      correlationId: batchCorrelationId,
      endpoint: job.endpoint,
      dataset: job.dataset,
    }, {
      symbolCount: job.symbols.length,
      topic,
    });

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const symbol of job.symbols) {
      const context: LogContext = {
        correlationId: batchCorrelationId,
        provider: this.provider.name,
        symbol,
        dataset: job.dataset,
        endpoint: job.endpoint,
      };

      // Check rate limiter
      if (!this.rateLimiter.canProceed(context)) {
        skipped++;
        continue;
      }

      try {
        // Fetch + validate + wrap in StandardEvent
        const event = await this.provider.fetch(symbol, job.endpoint, job.dataset);

        // Record the API call
        this.rateLimiter.recordCall();

        // Publish to Kafka
        await this.kafka.publish(topic, event, context);

        log('JOB_COMPLETE', 'SUCCESS', context);
        succeeded++;
      } catch (err: any) {
        log('JOB_COMPLETE', 'ERROR', context, { error: err.message });
        failed++;
      }

      // Small delay between symbols to respect per-minute rate limits
      await this.delay(500);
    }

    const stats = this.rateLimiter.getStats();
    log('BATCH_COMPLETE', 'SUCCESS', {
      correlationId: batchCorrelationId,
      endpoint: job.endpoint,
      dataset: job.dataset,
    }, {
      succeeded,
      failed,
      skipped,
      budgetRemaining: stats.remaining,
    });
  }

  /**
   * Converts intervalHours to a cron expression.
   * Examples: 1h → "0 * * * *", 24h → "0 0 * * *", 168h → "0 0 * * 0"
   */
  private intervalToCron(hours: number): string {
    if (hours <= 1) return '0 * * * *';         // Every hour
    if (hours <= 24) return `0 */${hours} * * *`; // Every N hours
    if (hours <= 168) return '0 0 * * 0';        // Weekly (Sunday midnight)
    return '0 0 1 * *';                          // Monthly
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
