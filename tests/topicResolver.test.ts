import { TopicResolver } from '../src/messaging/topic.resolver';

describe('TopicResolver', () => {
  const resolver = new TopicResolver({
    TIME_SERIES_INTRADAY: 'stock.market.intraday',
    TIME_SERIES_DAILY: 'stock.market.daily',
    OVERVIEW: 'stock.company.overview',
    EARNINGS: 'stock.company.earnings',
  });

  it('should resolve intraday endpoint to correct topic', () => {
    expect(resolver.resolve('TIME_SERIES_INTRADAY')).toBe('stock.market.intraday');
  });

  it('should resolve daily endpoint to correct topic', () => {
    expect(resolver.resolve('TIME_SERIES_DAILY')).toBe('stock.market.daily');
  });

  it('should resolve overview endpoint to correct topic', () => {
    expect(resolver.resolve('OVERVIEW')).toBe('stock.company.overview');
  });

  it('should throw for unmapped endpoint', () => {
    expect(() => resolver.resolve('UNKNOWN_ENDPOINT')).toThrow(
      'No Kafka topic configured for endpoint "UNKNOWN_ENDPOINT"'
    );
  });
});
