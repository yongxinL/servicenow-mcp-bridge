/**
 * TypeScript types for ServiceNow API requests and responses.
 */

/**
 * Query parameters for ServiceNow Table API queries.
 * Maps to ServiceNow's sysparm_* URL parameters.
 */
export interface QueryParams {
  /** Encoded query string (e.g., "active=true^priority=1") */
  sysparm_query?: string;

  /** Maximum number of records to return */
  sysparm_limit?: number;

  /** Number of records to skip (pagination offset) */
  sysparm_offset?: number;

  /** Comma-separated list of fields to return */
  sysparm_fields?: string;

  /** Whether to return display values instead of actual values */
  sysparm_display_value?: 'true' | 'false' | 'all';

  /** Field to order by with optional DESC suffix (e.g., "sys_created_on" or "priorityDESC") */
  sysparm_order_by?: string;
}

/**
 * ServiceNow API response envelope for list queries.
 * Contains an array of results.
 */
export interface ServiceNowResponse<T> {
  result: T[];
}

/**
 * ServiceNow API response envelope for single record queries.
 * Contains a single result object.
 */
export interface ServiceNowSingleResponse<T> {
  result: T;
}

/**
 * Error thrown when ServiceNow API returns an HTTP error status.
 * Carries status code, status text, and response body for downstream error handling.
 */
export class ServiceNowHttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly statusText: string,
    public readonly body: string,
  ) {
    super(`ServiceNow API error: ${statusCode} ${statusText}`);
    this.name = 'ServiceNowHttpError';
  }
}
