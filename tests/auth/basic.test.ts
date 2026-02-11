/**
 * Unit tests for BasicAuthStrategy
 */

import { describe, it, expect } from 'vitest';
import { BasicAuthStrategy } from '../../src/auth/basic.js';

describe('BasicAuthStrategy', () => {
  it('should generate correct Basic Auth header', async () => {
    const strategy = new BasicAuthStrategy('testuser', 'testpass');
    const headers = await strategy.getAuthHeaders();

    expect(headers).toHaveProperty('Authorization');
    expect(headers.Authorization).toMatch(/^Basic /);
  });

  it('should correctly encode username:password in Base64', async () => {
    const strategy = new BasicAuthStrategy('admin', 'password123');
    const headers = await strategy.getAuthHeaders();

    // admin:password123 in Base64 is YWRtaW46cGFzc3dvcmQxMjM=
    const expectedEncoded = Buffer.from('admin:password123').toString('base64');
    expect(headers.Authorization).toBe(`Basic ${expectedEncoded}`);
  });

  it('should handle special characters in credentials', async () => {
    const strategy = new BasicAuthStrategy('user@example.com', 'p@ss:w0rd!');
    const headers = await strategy.getAuthHeaders();

    const expectedEncoded = Buffer.from('user@example.com:p@ss:w0rd!').toString(
      'base64',
    );
    expect(headers.Authorization).toBe(`Basic ${expectedEncoded}`);
  });

  it('should return same headers on multiple calls', async () => {
    const strategy = new BasicAuthStrategy('testuser', 'testpass');
    const headers1 = await strategy.getAuthHeaders();
    const headers2 = await strategy.getAuthHeaders();

    expect(headers1).toEqual(headers2);
  });
});
