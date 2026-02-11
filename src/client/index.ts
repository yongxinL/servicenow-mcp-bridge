/**
 * ServiceNow HTTP client for Table API and Aggregate API operations.
 */

import { AuthStrategy } from '../auth/types.js';
import {
  QueryParams,
  ServiceNowResponse,
  ServiceNowSingleResponse,
  ServiceNowHttpError,
} from './types.js';
import { buildQueryString } from './query-builder.js';

export { QueryParams, ServiceNowHttpError } from './types.js';

/**
 * Configuration options for ServiceNowClient
 */
export interface ClientConfig {
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Central HTTP client for ServiceNow REST API communication.
 * Handles URL construction, authentication, request execution, and response parsing.
 */
export class ServiceNowClient {
  private readonly baseUrl: string;

  /**
   * Create a new ServiceNow API client.
   *
   * @param instanceName - ServiceNow instance name (e.g., "dev12345" or "dev12345.service-now.com")
   * @param authStrategy - Authentication strategy for generating auth headers
   * @param config - Client configuration options
   */
  constructor(
    instanceName: string,
    private readonly authStrategy: AuthStrategy,
    private readonly config: ClientConfig,
  ) {
    // Support both short names ("mycompany") and full domains ("mycompany.service-now.com")
    this.baseUrl = instanceName.includes('.')
      ? `https://${instanceName}`
      : `https://${instanceName}.service-now.com`;
  }

  /**
   * Query records from a ServiceNow table.
   *
   * @param table - Table name (e.g., "incident", "sys_user")
   * @param params - Query parameters for filtering, pagination, field selection
   * @returns Promise resolving to array of records wrapped in ServiceNow response envelope
   */
  async get<T = Record<string, unknown>>(
    table: string,
    params?: QueryParams,
  ): Promise<ServiceNowResponse<T>> {
    const url = this.buildUrl(this.tableUrl(table), params);
    return this.request<ServiceNowResponse<T>>(url, { method: 'GET' });
  }

  /**
   * Get a single record by sys_id.
   *
   * @param table - Table name
   * @param sysId - Record sys_id
   * @param params - Optional field selection and display value params
   * @returns Promise resolving to the record
   */
  async getById<T = Record<string, unknown>>(
    table: string,
    sysId: string,
    params?: Pick<QueryParams, 'sysparm_fields' | 'sysparm_display_value'>,
  ): Promise<T> {
    const url = this.buildUrl(this.tableUrl(table, sysId), params);
    const response =
      await this.request<ServiceNowSingleResponse<T>>(url, { method: 'GET' });
    return response.result;
  }

  /**
   * Create a new record in a ServiceNow table.
   *
   * @param table - Table name
   * @param body - Record data to create
   * @returns Promise resolving to the created record
   */
  async post<T = Record<string, unknown>>(
    table: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const url = this.tableUrl(table);
    const response = await this.request<ServiceNowSingleResponse<T>>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return response.result;
  }

  /**
   * Update an existing record in a ServiceNow table.
   *
   * @param table - Table name
   * @param sysId - Record sys_id to update
   * @param body - Partial record data to update
   * @returns Promise resolving to the updated record
   */
  async patch<T = Record<string, unknown>>(
    table: string,
    sysId: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const url = this.tableUrl(table, sysId);
    const response = await this.request<ServiceNowSingleResponse<T>>(url, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return response.result;
  }

  /**
   * Delete a record from a ServiceNow table.
   *
   * @param table - Table name
   * @param sysId - Record sys_id to delete
   * @returns Promise resolving when delete is complete
   */
  async delete(table: string, sysId: string): Promise<void> {
    const url = this.tableUrl(table, sysId);
    await this.request<void>(url, { method: 'DELETE' });
  }

  /**
   * Execute an aggregate query against a ServiceNow table.
   * Uses the ServiceNow Aggregate API (/api/now/stats).
   *
   * @param table - Table name
   * @param params - Query parameters including aggregation options
   * @returns Promise resolving to aggregated results
   */
  async aggregate<T = Record<string, unknown>>(
    table: string,
    params?: QueryParams,
  ): Promise<ServiceNowResponse<T>> {
    const url = this.buildUrl(this.aggregateUrl(table), params);
    return this.request<ServiceNowResponse<T>>(url, { method: 'GET' });
  }

  /**
   * Build full URL with query parameters.
   */
  private buildUrl(baseUrl: string, params?: QueryParams): string {
    const queryString = buildQueryString(params);
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Construct Table API URL.
   */
  private tableUrl(table: string, sysId?: string): string {
    const base = `${this.baseUrl}/api/now/table/${encodeURIComponent(table)}`;
    return sysId ? `${base}/${encodeURIComponent(sysId)}` : base;
  }

  /**
   * Construct Aggregate API URL.
   */
  private aggregateUrl(table: string): string {
    return `${this.baseUrl}/api/now/stats/${encodeURIComponent(table)}`;
  }

  /**
   * Execute HTTP request with authentication, timeout, and error handling.
   */
  private async request<T>(url: string, options: RequestInit): Promise<T> {
    const authHeaders = await this.authStrategy.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ServiceNowHttpError(
        response.status,
        response.statusText,
        body,
      );
    }

    // DELETE returns no content
    if (response.status === 204 || options.method === 'DELETE') {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
