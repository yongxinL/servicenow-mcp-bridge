/**
 * Unit tests for TokenAuthStrategy
 */

import { describe, it, expect } from 'vitest';
import { TokenAuthStrategy } from '../../src/auth/token.js';

describe('TokenAuthStrategy', () => {
  it('should generate correct Bearer token header', async () => {
    const strategy = new TokenAuthStrategy('my-secret-token');
    const headers = await strategy.getAuthHeaders();

    expect(headers).toHaveProperty('Authorization');
    expect(headers.Authorization).toBe('Bearer my-secret-token');
  });

  it('should handle JWT-like tokens', async () => {
    const jwtToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const strategy = new TokenAuthStrategy(jwtToken);
    const headers = await strategy.getAuthHeaders();

    expect(headers.Authorization).toBe(`Bearer ${jwtToken}`);
  });

  it('should return same headers on multiple calls', async () => {
    const strategy = new TokenAuthStrategy('static-token-123');
    const headers1 = await strategy.getAuthHeaders();
    const headers2 = await strategy.getAuthHeaders();

    expect(headers1).toEqual(headers2);
  });

  it('should handle empty token', async () => {
    const strategy = new TokenAuthStrategy('');
    const headers = await strategy.getAuthHeaders();

    expect(headers.Authorization).toBe('Bearer ');
  });
});
