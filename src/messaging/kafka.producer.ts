// ── Kafka Producer ───────────────────────────────────────────────────────────
// Wraps KafkaJS producer for Confluent Cloud (SASL_SSL).
// The Source Service publishes events here.
// It never knows or cares who consumes them.

import { Kafka, Producer, Partitioners } from 'kafkajs';
import { StandardEvent } from '../domain/events';
import { log, LogContext } from '../utils/logger';

export class KafkaProducer {
  private producer: Producer;
  private connected = false;

  constructor(
    brokers: string,
    username: string,
    password: string
  ) {
    const kafka = new Kafka({
      clientId: 'stock-data-platform',
      brokers: [brokers],
      ssl: true,
      sasl: {
        mechanism: 'plain',
        username,
        password,
      },
      retry: {
        initialRetryTime: 300,
        retries: 5,
      },
    });

    this.producer = kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.producer.connect();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.producer.disconnect();
    this.connected = false;
  }

  /**
   * Publishes a StandardEvent to the specified Kafka topic.
   * Uses the eventId as the message key for consistent partitioning.
   */
  async publish(
    topic: string,
    event: StandardEvent,
    context: LogContext
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('Kafka producer is not connected. Call connect() first.');
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.eventId,
            value: JSON.stringify(event),
            headers: {
              provider: event.provider,
              dataset: event.dataset,
              endpoint: event.endpoint,
              symbol: event.symbol,
            },
          },
        ],
      });

      log('KAFKA_PUBLISH', 'SUCCESS', context, {
        topic,
        eventId: event.eventId,
      });
    } catch (err: any) {
      log('KAFKA_PUBLISH', 'ERROR', context, {
        topic,
        error: err.message,
      });
      throw err;
    }
  }
}
