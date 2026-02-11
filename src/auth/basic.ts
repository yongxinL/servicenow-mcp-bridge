/**
 * Basic authentication strategy using Base64-encoded username:password.
 */

import { AuthStrategy } from './types.js';

export class BasicAuthStrategy implements AuthStrategy {
  constructor(
    private readonly username: string,
    private readonly password: string,
  ) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    const credentials = `${this.username}:${this.password}`;
    const encoded = Buffer.from(credentials).toString('base64');
    return {
      Authorization: `Basic ${encoded}`,
    };
  }
}
