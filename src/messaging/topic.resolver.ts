// ── Topic Resolver ───────────────────────────────────────────────────────────
// Maps an endpoint name to the correct Kafka topic.
// Configuration-driven: reads from config.json, not hardcoded.

export class TopicResolver {
  private readonly topicMap: Record<string, string>;

  constructor(topicMap: Record<string, string>) {
    this.topicMap = topicMap;
  }

  /**
   * Resolves the Kafka topic for a given API endpoint.
   * Throws if no mapping is defined — fail loud, don't silently drop events.
   */
  resolve(endpoint: string): string {
    const topic = this.topicMap[endpoint];
    if (!topic) {
      throw new Error(
        `No Kafka topic configured for endpoint "${endpoint}". ` +
        `Add it to config.json under kafka.topics.`
      );
    }
    return topic;
  }
}
