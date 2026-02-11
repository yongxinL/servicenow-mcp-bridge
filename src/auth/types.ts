/**
 * Authentication strategy interface.
 * All auth implementations must provide a method to generate auth headers.
 */
export interface AuthStrategy {
  /**
   * Returns HTTP headers to attach to ServiceNow API requests.
   * Returns a Promise to support both synchronous (Basic, Token) and
   * asynchronous (OAuth with token refresh) implementations.
   */
  getAuthHeaders(): Promise<Record<string, string>>;
}
