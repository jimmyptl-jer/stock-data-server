import { validateResponse } from '../src/providers/alphavantage/validator';

describe('Alpha Vantage Validator', () => {
  describe('TIME_SERIES_INTRADAY', () => {
    it('should pass for valid intraday response', () => {
      const data = {
        'Meta Data': { '1. Information': 'Intraday' },
        'Time Series (5min)': { '2026-07-09 09:00:00': {} },
      };
      expect(validateResponse(data, 'TIME_SERIES_INTRADAY')).toEqual({ valid: true });
    });

    it('should fail when Meta Data is missing', () => {
      const data = { 'Time Series (5min)': {} };
      const result = validateResponse(data, 'TIME_SERIES_INTRADAY');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Meta Data');
    });

    it('should fail when Time Series is missing', () => {
      const data = { 'Meta Data': {} };
      const result = validateResponse(data, 'TIME_SERIES_INTRADAY');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Time Series');
    });
  });

  describe('OVERVIEW', () => {
    it('should pass for valid overview response', () => {
      const data = { Symbol: 'AAPL', Name: 'Apple Inc', Exchange: 'NASDAQ' };
      expect(validateResponse(data, 'OVERVIEW')).toEqual({ valid: true });
    });

    it('should fail when Symbol is missing', () => {
      const data = { Name: 'Apple Inc', Exchange: 'NASDAQ' };
      const result = validateResponse(data, 'OVERVIEW');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Symbol');
    });
  });

  describe('Error detection', () => {
    it('should catch Error Message', () => {
      const data = { 'Error Message': 'Invalid API call' };
      const result = validateResponse(data, 'TIME_SERIES_INTRADAY');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('API Error');
    });

    it('should catch rate limit Note', () => {
      const data = { Note: 'Thank you for using Alpha Vantage...' };
      const result = validateResponse(data, 'TIME_SERIES_INTRADAY');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Rate Limit');
    });

    it('should catch rate limit Information', () => {
      const data = { Information: 'Please visit our API rate limit page' };
      const result = validateResponse(data, 'TIME_SERIES_INTRADAY');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Rate Limit');
    });

    it('should fail on null data', () => {
      const result = validateResponse(null, 'TIME_SERIES_INTRADAY');
      expect(result.valid).toBe(false);
    });

    it('should fail on empty object with required fields', () => {
      const result = validateResponse({}, 'TIME_SERIES_INTRADAY');
      expect(result.valid).toBe(false);
    });
  });
});
