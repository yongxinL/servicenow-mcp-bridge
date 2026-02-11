/**
 * OAuth 2.0 Client Credentials authentication strategy.
 * Implements automatic token caching and refresh with expiry buffer.
 */

import { AuthStrategy } from './types.js';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class OAuthStrategy implements AuthStrategy {
  private token: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<void> | null = null;

  constructor(
    private readonly instanceUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly tokenUrl?: string,
    private readonly refreshBufferMs: number = 60_000,
  ) {}

  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.needsRefresh()) {
      await this.refresh();
    }

    if (!this.token) {
      throw new Error('OAuth token not available');
    }

    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Check if token needs refresh (expired or will expire within buffer window)
   */
  private needsRefresh(): boolean {
    const now = Date.now();
    return this.token === null || now + this.refreshBufferMs >= this.expiresAt;
  }

  /**
   * Refresh the OAuth token from ServiceNow token endpoint.
   * Uses a promise lock to prevent concurrent refresh requests.
   */
  private async refresh(): Promise<void> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Start a new refresh and store the promise
    this.refreshPromise = this.doRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh by calling ServiceNow OAuth endpoint
   */
  private async doRefresh(): Promise<void> {
    const tokenEndpoint =
      this.tokenUrl || `${this.instanceUrl}/oauth_token.do`;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OAuth token refresh failed: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = (await response.json()) as TokenResponse;

      if (!data.access_token || !data.expires_in) {
        throw new Error(
          'Invalid OAuth token response: missing access_token or expires_in',
        );
      }

      // Store token and calculate expiry timestamp
      this.token = data.access_token;
      this.expiresAt = Date.now() + data.expires_in * 1000;
    } catch (error) {
      // Clear token on failure to force retry on next request
      this.token = null;
      this.expiresAt = 0;

      if (error instanceof Error) {
        throw new Error(`OAuth token refresh failed: ${error.message}`);
      }
      throw error;
    }
  }
}
