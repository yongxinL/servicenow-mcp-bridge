/**
 * Authentication module exports and factory function.
 */

import { AppConfig } from '../config/schema.js';
import { AuthStrategy } from './types.js';
import { BasicAuthStrategy } from './basic.js';
import { OAuthStrategy } from './oauth.js';
import { TokenAuthStrategy } from './token.js';

export { AuthStrategy } from './types.js';
export { BasicAuthStrategy } from './basic.js';
export { OAuthStrategy } from './oauth.js';
export { TokenAuthStrategy } from './token.js';

/**
 * Create an authentication strategy based on configuration.
 *
 * @param authConfig - Auth configuration from app config
 * @param instanceUrl - ServiceNow instance URL (e.g., https://dev12345.service-now.com)
 * @returns Configured authentication strategy
 * @throws Error if auth type is unsupported or configuration is invalid
 */
export function createAuthStrategy(
  authConfig: AppConfig['auth'],
  instanceUrl: string,
): AuthStrategy {
  switch (authConfig.type) {
    case 'basic':
      return new BasicAuthStrategy(authConfig.username, authConfig.password);

    case 'oauth':
      return new OAuthStrategy(
        instanceUrl,
        authConfig.client_id,
        authConfig.client_secret,
        authConfig.token_url,
      );

    case 'token':
      return new TokenAuthStrategy(authConfig.token);

    default:
      // TypeScript exhaustiveness check
      const exhaustiveCheck: never = authConfig;
      throw new Error(
        `Unsupported auth type: ${(exhaustiveCheck as any).type}`,
      );
  }
}
