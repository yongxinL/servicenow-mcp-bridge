/**
 * Unit tests for OAuthStrategy
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OAuthStrategy } from '../../src/auth/oauth.js';

describe('OAuthStrategy', () => {
  const mockInstanceUrl = 'https://dev12345.service-now.com';
  const mockClientId = 'test-client-id';
  const mockClientSecret = 'test-client-secret';

  // Mock token response
  const mockTokenResponse = {
    access_token: 'mock-access-token-12345',
    token_type: 'Bearer',
    expires_in: 3600, // 1 hour
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Token Fetching', () => {
    it('should fetch token on first call', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      const headers = await strategy.getAuthHeaders();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockInstanceUrl}/oauth_token.do`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      expect(headers.Authorization).toBe(
        `Bearer ${mockTokenResponse.access_token}`,
      );
    });

    it('should use custom token URL if provided', async () => {
      const customTokenUrl = 'https://custom.service-now.com/custom_oauth';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
        customTokenUrl,
      );

      await strategy.getAuthHeaders();

      expect(mockFetch).toHaveBeenCalledWith(
        customTokenUrl,
        expect.any(Object),
      );
    });

    it('should send correct OAuth request body', async () => {
      let requestBody = '';
      const mockFetch = vi.fn().mockImplementation(async (_url, options) => {
        requestBody = options.body;
        return {
          ok: true,
          json: async () => mockTokenResponse,
        };
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      await strategy.getAuthHeaders();

      const params = new URLSearchParams(requestBody);
      expect(params.get('grant_type')).toBe('client_credentials');
      expect(params.get('client_id')).toBe(mockClientId);
      expect(params.get('client_secret')).toBe(mockClientSecret);
    });
  });

  describe('Token Caching', () => {
    it('should cache token and not refetch on subsequent calls', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      // First call - should fetch
      const headers1 = await strategy.getAuthHeaders();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cached token
      const headers2 = await strategy.getAuthHeaders();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, no additional fetch

      expect(headers1).toEqual(headers2);
    });

    it('should return same token within expiry window', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      await strategy.getAuthHeaders();

      // Advance time by 30 minutes (token expires in 1 hour)
      vi.advanceTimersByTime(30 * 60 * 1000);

      await strategy.getAuthHeaders();

      // Should still be using cached token
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh token when it expires', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockTokenResponse,
            access_token: 'refreshed-token-67890',
          }),
        });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      // First call
      const headers1 = await strategy.getAuthHeaders();
      expect(headers1.Authorization).toBe(
        `Bearer ${mockTokenResponse.access_token}`,
      );

      // Advance time past expiry (3600s + 60s buffer)
      vi.advanceTimersByTime((3600 + 61) * 1000);

      // Second call should trigger refresh
      const headers2 = await strategy.getAuthHeaders();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(headers2.Authorization).toBe('Bearer refreshed-token-67890');
    });

    it('should refresh token within buffer window before expiry', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
        undefined,
        60_000, // 60 second buffer
      );

      await strategy.getAuthHeaders();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance time to 59 minutes (1 minute before expiry, within buffer)
      vi.advanceTimersByTime(59 * 60 * 1000);

      await strategy.getAuthHeaders();

      // Should have triggered refresh because we're within 60s buffer
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should prevent concurrent token refreshes', async () => {
      // Use real timers for this test since we need actual async behavior
      vi.useRealTimers();

      let fetchCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        fetchCount++;
        // Simulate a small delay
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          ok: true,
          json: async () => mockTokenResponse,
        };
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      // Make multiple concurrent calls before first token fetch completes
      const promises = [
        strategy.getAuthHeaders(),
        strategy.getAuthHeaders(),
        strategy.getAuthHeaders(),
      ];

      await Promise.all(promises);

      // Should only fetch once despite concurrent calls
      expect(fetchCount).toBe(1);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });
  });

  describe('Error Handling', () => {
    it('should throw error if token endpoint returns error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid client credentials',
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      await expect(strategy.getAuthHeaders()).rejects.toThrow(
        /OAuth token refresh failed.*401/,
      );
    });

    it('should throw error if response missing access_token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          token_type: 'Bearer',
          expires_in: 3600,
          // Missing access_token
        }),
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      await expect(strategy.getAuthHeaders()).rejects.toThrow(
        /Invalid OAuth token response/,
      );
    });

    it('should throw error if response missing expires_in', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'token-123',
          token_type: 'Bearer',
          // Missing expires_in
        }),
      });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      await expect(strategy.getAuthHeaders()).rejects.toThrow(
        /Invalid OAuth token response/,
      );
    });

    it('should handle network errors gracefully', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error('Network connection failed'));
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      await expect(strategy.getAuthHeaders()).rejects.toThrow(
        /OAuth token refresh failed.*Network connection failed/,
      );
    });

    it('should clear token on refresh failure', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockTokenResponse,
            access_token: 'recovered-token',
          }),
        });
      global.fetch = mockFetch;

      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
      );

      // First call succeeds
      await strategy.getAuthHeaders();

      // Advance past expiry to trigger refresh
      vi.advanceTimersByTime((3600 + 61) * 1000);

      // Second call should fail to refresh
      await expect(strategy.getAuthHeaders()).rejects.toThrow();

      // Third call should retry and succeed
      const headers = await strategy.getAuthHeaders();
      expect(headers.Authorization).toBe('Bearer recovered-token');
    });
  });

  describe('Custom Refresh Buffer', () => {
    it('should respect custom refresh buffer', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });
      global.fetch = mockFetch;

      const customBuffer = 120_000; // 2 minutes
      const strategy = new OAuthStrategy(
        mockInstanceUrl,
        mockClientId,
        mockClientSecret,
        undefined,
        customBuffer,
      );

      await strategy.getAuthHeaders();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance to 58 minutes (2 minutes before expiry)
      vi.advanceTimersByTime(58 * 60 * 1000);

      await strategy.getAuthHeaders();

      // Should have triggered refresh with 2-minute buffer
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
