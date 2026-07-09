import { generateEventId } from '../src/utils/eventId';

describe('generateEventId', () => {
  it('should generate a consistent hash for the same inputs', () => {
    const symbol = 'AAPL';
    const endpoint = 'TIME_SERIES_INTRADAY';
    const requestTime = '2026-07-09T09:00:00Z';

    const hash1 = generateEventId(symbol, endpoint, requestTime);
    const hash2 = generateEventId(symbol, endpoint, requestTime);

    expect(hash1).toEqual(hash2);
    expect(typeof hash1).toBe('string');
    expect(hash1.length).toBe(64); // SHA-256 hex length
  });

  it('should ignore case and whitespace differences', () => {
    const hash1 = generateEventId('AAPL', 'TIME_SERIES_INTRADAY', '2026-07-09T09:00:00Z');
    const hash2 = generateEventId(' aapl ', ' time_series_intraday ', '2026-07-09T09:00:00Z');

    expect(hash1).toEqual(hash2);
  });

  it('should generate different hashes for different timestamps', () => {
    const hash1 = generateEventId('AAPL', 'TIME_SERIES_INTRADAY', '2026-07-09T09:00:00Z');
    const hash2 = generateEventId('AAPL', 'TIME_SERIES_INTRADAY', '2026-07-09T10:00:00Z');

    expect(hash1).not.toEqual(hash2);
  });

  it('should throw an error if inputs are missing', () => {
    expect(() => generateEventId('', 'TIME_SERIES_INTRADAY', '2026-07-09T09:00:00Z')).toThrow();
    expect(() => generateEventId('AAPL', '', '2026-07-09T09:00:00Z')).toThrow();
    expect(() => generateEventId('AAPL', 'TIME_SERIES_INTRADAY', '')).toThrow();
  });
});
