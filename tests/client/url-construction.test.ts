/**
 * Unit tests for ServiceNowClient URL construction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceNowClient } from '../../src/client/index.js';
import { AuthStrategy } from '../../src/auth/types.js';

describe('ServiceNowClient - URL Construction', () => {
  let mockAuthStrategy: AuthStrategy;

  beforeEach(() => {
    // Mock auth strategy
    mockAuthStrategy = {
      getAuthHeaders: vi.fn().mockResolvedValue({
        Authorization: 'Bearer mock-token',
      }),
    };

    // Mock fetch to capture URLs
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: [] }),
      text: async () => '',
    });
  });

  describe('Base URL Construction', () => {
    it('should construct base URL from short instance name', () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      // Access private baseUrl via reflection for testing
      expect((client as any).baseUrl).toBe('https://dev12345.service-now.com');
    });

    it('should construct base URL from full domain name', () => {
      const client = new ServiceNowClient(
        'mycompany.service-now.com',
        mockAuthStrategy,
        { timeout: 30000 },
      );

      expect((client as any).baseUrl).toBe('https://mycompany.service-now.com');
    });

    it('should handle custom domain', () => {
      const client = new ServiceNowClient(
        'custom.domain.com',
        mockAuthStrategy,
        { timeout: 30000 },
      );

      expect((client as any).baseUrl).toBe('https://custom.domain.com');
    });
  });

  describe('Table API URLs', () => {
    it('should construct table list URL', async () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      await client.get('incident');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/table/incident',
        expect.any(Object),
      );
    });

    it('should construct table get-by-id URL', async () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: { sys_id: '123' } }),
      });

      await client.getById('incident', 'sys-id-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/table/incident/sys-id-123',
        expect.any(Object),
      );
    });

    it('should encode table names with special characters', async () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      await client.get('u_custom_table');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/table/u_custom_table',
        expect.any(Object),
      );
    });

    it('should encode sys_id values', async () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ result: {} }),
      });

      await client.getById('incident', 'abc-123-xyz');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/table/incident/abc-123-xyz',
        expect.any(Object),
      );
    });
  });

  describe('Aggregate API URLs', () => {
    it('should construct aggregate URL', async () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      await client.aggregate('incident');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/stats/incident',
        expect.any(Object),
      );
    });

    it('should encode table name in aggregate URL', async () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      await client.aggregate('u_custom_table');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/stats/u_custom_table',
        expect.any(Object),
      );
    });
  });

  describe('Query Parameters', () => {
    it('should append query parameters to URL', async () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      await client.get('incident', { sysparm_limit: 10 });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/table/incident?sysparm_limit=10',
        expect.any(Object),
      );
    });

    it('should append multiple query parameters', async () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      await client.get('incident', {
        sysparm_limit: 10,
        sysparm_offset: 20,
        sysparm_query: 'active=true',
      });

      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('sysparm_limit=10');
      expect(callUrl).toContain('sysparm_offset=20');
      expect(callUrl).toContain('sysparm_query=active%3Dtrue');
    });

    it('should not append query string if no params', async () => {
      const client = new ServiceNowClient('dev12345', mockAuthStrategy, {
        timeout: 30000,
      });

      await client.get('incident');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://dev12345.service-now.com/api/now/table/incident',
        expect.any(Object),
      );
    });
  });
});
