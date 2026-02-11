/**
 * Query parameter serialization for ServiceNow API requests.
 */

import { QueryParams } from './types.js';

/**
 * Builds a URL query string from ServiceNow query parameters.
 * Omits undefined and null values.
 *
 * @param params - Query parameters object
 * @returns URL-encoded query string (without leading "?")
 *
 * @example
 * buildQueryString({ sysparm_limit: 10, sysparm_query: "active=true" })
 * // Returns: "sysparm_limit=10&sysparm_query=active%3Dtrue"
 */
export function buildQueryString(params?: QueryParams): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  return searchParams.toString();
}
