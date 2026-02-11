/**
 * Static bearer token authentication strategy.
 */

import { AuthStrategy } from './types.js';

export class TokenAuthStrategy implements AuthStrategy {
  constructor(private readonly token: string) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }
}
