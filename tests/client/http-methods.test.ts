/**
 * Unit tests for ServiceNowClient HTTP methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceNowClient } from '../../src/client/index.js';
import { AuthStrategy } from '../../src/auth/types.js';

describe('ServiceNowClient - HTTP Methods', () => {
  let mockAuthStrategy: AuthStrategy;
  let client: ServiceNowClient;

  beforeEach(() => {
    mockAuthStrategy = {
      getAuthHeaders: vi.fn().mockResolvedValue({
        Authorization: 'Bearer mock-token',
      }),
    };

    client = new ServiceNowClient('dev12345', mockAuthStrategy, {
      timeout: 30000,
    });
  });

  describe('GET method', () => {
    it('should make GET request with correct headers', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: [] }),
      });
      global.fetch = mockFetch;

      await client.get('incident');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer mock-token',
          }),
        }),
      );
    });

    it('should return array of results', async () => {
      const mockData = [
        { sys_id: '1', number: 'INC0001' },
        { sys_id: '2', number: 'INC0002' },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: mockData }),
      });

      const response = await client.get('incident');

      expect(response.result).toEqual(mockData);
    });

    it('should pass timeout to AbortSignal', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: [] }),
      });
      global.fetch = mockFetch;

      const clientWithTimeout = new ServiceNowClient(
        'dev12345',
        mockAuthStrategy,
        { timeout: 5000 },
      );

      await clientWithTimeout.get('incident');

      const fetchCall = mockFetch.mock.calls[0][1];
      expect(fetchCall.signal).toBeDefined();
    });
  });

  describe('getById method', () => {
    it('should make GET request for specific record', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: { sys_id: '123', number: 'INC0001' } }),
      });
      global.fetch = mockFetch;

      await client.getById('incident', 'sys-id-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/table/incident/sys-id-123',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should return single result without envelope', async () => {
      const mockRecord = { sys_id: '123', number: 'INC0001' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: mockRecord }),
      });

      const result = await client.getById('incident', 'sys-id-123');

      expect(result).toEqual(mockRecord);
    });

    it('should support field selection parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: {} }),
      });
      global.fetch = mockFetch;

      await client.getById('incident', 'sys-id-123', {
        sysparm_fields: 'sys_id,number',
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('sysparm_fields=sys_id%2Cnumber');
    });
  });

  describe('POST method', () => {
    it('should make POST request with body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ result: { sys_id: 'new-123' } }),
      });
      global.fetch = mockFetch;

      const body = { short_description: 'Test incident', urgency: '2' };
      await client.post('incident', body);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should return created record without envelope', async () => {
      const mockRecord = { sys_id: 'new-123', number: 'INC0010' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ result: mockRecord }),
      });

      const result = await client.post('incident', {
        short_description: 'Test',
      });

      expect(result).toEqual(mockRecord);
    });
  });

  describe('PATCH method', () => {
    it('should make PATCH request with body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: {} }),
      });
      global.fetch = mockFetch;

      const body = { state: '6', close_notes: 'Resolved' };
      await client.patch('incident', 'sys-id-123', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/table/incident/sys-id-123',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      );
    });

    it('should return updated record without envelope', async () => {
      const mockRecord = { sys_id: '123', state: '6' };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: mockRecord }),
      });

      const result = await client.patch('incident', 'sys-id-123', {
        state: '6',
      });

      expect(result).toEqual(mockRecord);
    });
  });

  describe('DELETE method', () => {
    it('should make DELETE request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => '',
      });
      global.fetch = mockFetch;

      await client.delete('incident', 'sys-id-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/table/incident/sys-id-123',
        expect.objectContaining({
          method: 'DELETE',
        }),
      );
    });

    it('should return void on successful delete', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => '',
      });

      const result = await client.delete('incident', 'sys-id-123');

      expect(result).toBeUndefined();
    });
  });

  describe('aggregate method', () => {
    it('should make GET request to stats endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: [] }),
      });
      global.fetch = mockFetch;

      await client.aggregate('incident');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/stats/incident',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });

    it('should support query parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: [] }),
      });
      global.fetch = mockFetch;

      await client.aggregate('incident', {
        sysparm_query: 'active=true',
        sysparm_limit: 10,
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('sysparm_query=active%3Dtrue');
      expect(url).toContain('sysparm_limit=10');
    });
  });

  describe('Authentication', () => {
    it('should call authStrategy.getAuthHeaders for every request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: [] }),
      });

      await client.get('incident');
      await client.get('change_request');

      expect(mockAuthStrategy.getAuthHeaders).toHaveBeenCalledTimes(2);
    });

    it('should include auth headers in request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: [] }),
      });
      global.fetch = mockFetch;

      mockAuthStrategy.getAuthHeaders = vi.fn().mockResolvedValue({
        Authorization: 'Basic dXNlcjpwYXNz',
        'X-Custom-Header': 'value',
      });

      await client.get('incident');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Basic dXNlcjpwYXNz',
            'X-Custom-Header': 'value',
          }),
        }),
      );
    });
  });
});
