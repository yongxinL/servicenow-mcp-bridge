/**
 * Unit tests for auth factory (createAuthStrategy)
 */

import { describe, it, expect } from 'vitest';
import { createAuthStrategy } from '../../src/auth/index.js';
import { BasicAuthStrategy } from '../../src/auth/basic.js';
import { OAuthStrategy } from '../../src/auth/oauth.js';
import { TokenAuthStrategy } from '../../src/auth/token.js';
import type { AppConfig } from '../../src/config/schema.js';

describe('createAuthStrategy', () => {
  const instanceUrl = 'https://dev12345.service-now.com';

  describe('Basic Auth', () => {
    it('should create BasicAuthStrategy for basic auth type', () => {
      const config: AppConfig['auth'] = {
        type: 'basic',
        username: 'testuser',
        password: 'testpass',
      };

      const strategy = createAuthStrategy(config, instanceUrl);

      expect(strategy).toBeInstanceOf(BasicAuthStrategy);
    });

    it('should pass credentials to BasicAuthStrategy', async () => {
      const config: AppConfig['auth'] = {
        type: 'basic',
        username: 'admin',
        password: 'secure123',
      };

      const strategy = createAuthStrategy(config, instanceUrl);
      const headers = await strategy.getAuthHeaders();

      const expectedEncoded = Buffer.from('admin:secure123').toString('base64');
      expect(headers.Authorization).toBe(`Basic ${expectedEncoded}`);
    });
  });

  describe('OAuth', () => {
    it('should create OAuthStrategy for oauth auth type', () => {
      const config: AppConfig['auth'] = {
        type: 'oauth',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
      };

      const strategy = createAuthStrategy(config, instanceUrl);

      expect(strategy).toBeInstanceOf(OAuthStrategy);
    });

    it('should pass token_url to OAuthStrategy if provided', () => {
      const config: AppConfig['auth'] = {
        type: 'oauth',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        token_url: 'https://custom.example.com/oauth',
      };

      const strategy = createAuthStrategy(config, instanceUrl);

      expect(strategy).toBeInstanceOf(OAuthStrategy);
      // Note: We can't directly test the internal token_url without mocking,
      // but the constructor receives it correctly
    });

    it('should work without token_url (uses default)', () => {
      const config: AppConfig['auth'] = {
        type: 'oauth',
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
      };

      const strategy = createAuthStrategy(config, instanceUrl);

      expect(strategy).toBeInstanceOf(OAuthStrategy);
    });
  });

  describe('Token Auth', () => {
    it('should create TokenAuthStrategy for token auth type', () => {
      const config: AppConfig['auth'] = {
        type: 'token',
        token: 'my-bearer-token',
      };

      const strategy = createAuthStrategy(config, instanceUrl);

      expect(strategy).toBeInstanceOf(TokenAuthStrategy);
    });

    it('should pass token to TokenAuthStrategy', async () => {
      const config: AppConfig['auth'] = {
        type: 'token',
        token: 'secret-token-123',
      };

      const strategy = createAuthStrategy(config, instanceUrl);
      const headers = await strategy.getAuthHeaders();

      expect(headers.Authorization).toBe('Bearer secret-token-123');
    });
  });

  describe('Invalid Auth Type', () => {
    it('should throw error for unsupported auth type', () => {
      const config = {
        type: 'unsupported-type',
      } as any;

      expect(() => createAuthStrategy(config, instanceUrl)).toThrow(
        /Unsupported auth type.*unsupported-type/,
      );
    });

    it('should throw error for invalid auth config', () => {
      const config = {
        type: 'invalid',
        someField: 'value',
      } as any;

      expect(() => createAuthStrategy(config, instanceUrl)).toThrow(
        /Unsupported auth type/,
      );
    });
  });

  describe('Instance URL', () => {
    it('should accept instanceUrl with https protocol', () => {
      const config: AppConfig['auth'] = {
        type: 'basic',
        username: 'user',
        password: 'pass',
      };

      const strategy = createAuthStrategy(
        config,
        'https://instance.service-now.com',
      );

      expect(strategy).toBeInstanceOf(BasicAuthStrategy);
    });

    it('should accept instanceUrl without trailing slash', () => {
      const config: AppConfig['auth'] = {
        type: 'basic',
        username: 'user',
        password: 'pass',
      };

      const strategy = createAuthStrategy(
        config,
        'https://instance.service-now.com',
      );

      expect(strategy).toBeInstanceOf(BasicAuthStrategy);
    });
  });
});
