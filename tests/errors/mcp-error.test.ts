/**
 * Unit tests for MCP error builders
 */

import { describe, it, expect } from 'vitest';
import {
  buildErrorResult,
  buildEmptyResultResponse,
  ServiceNowErrorCode,
} from '../../src/errors/index.js';

describe('buildErrorResult', () => {
  it('should create error result with code and message', () => {
    const result = buildErrorResult(
      ServiceNowErrorCode.NOT_FOUND,
      'Record not found',
    );

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('[NOT_FOUND] Record not found');
  });

  it('should include details when provided', () => {
    const result = buildErrorResult(
      ServiceNowErrorCode.VALIDATION_ERROR,
      'Invalid field value',
      'Field "priority" must be between 1 and 5',
    );

    expect(result.content[0].text).toContain('[VALIDATION_ERROR] Invalid field value');
    expect(result.content[0].text).toContain('Details: Field "priority" must be between 1 and 5');
  });

  it('should omit details section when not provided', () => {
    const result = buildErrorResult(
      ServiceNowErrorCode.SERVER_ERROR,
      'Server error occurred',
    );

    expect(result.content[0].text).toBe('[SERVER_ERROR] Server error occurred');
    expect(result.content[0].text).not.toContain('Details:');
  });

  it('should handle all error codes', () => {
    const codes = [
      ServiceNowErrorCode.VALIDATION_ERROR,
      ServiceNowErrorCode.AUTHENTICATION_ERROR,
      ServiceNowErrorCode.AUTHORIZATION_ERROR,
      ServiceNowErrorCode.NOT_FOUND,
      ServiceNowErrorCode.RATE_LIMITED,
      ServiceNowErrorCode.SERVER_ERROR,
      ServiceNowErrorCode.NETWORK_ERROR,
      ServiceNowErrorCode.CIRCUIT_OPEN,
    ];

    codes.forEach((code) => {
      const result = buildErrorResult(code, 'Test message');
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`[${code}]`);
    });
  });
});

describe('buildEmptyResultResponse', () => {
  it('should create non-error result for empty results', () => {
    const result = buildEmptyResultResponse('incident');

    expect(result.isError).toBe(false); // NOT an error!
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('No records found');
    expect(result.content[0].text).toContain('incident');
  });

  it('should include table name in message', () => {
    const result = buildEmptyResultResponse('change_request');

    expect(result.content[0].text).toContain('change_request');
  });

  it('should include query when provided', () => {
    const result = buildEmptyResultResponse('incident', 'active=true^priority=1');

    expect(result.content[0].text).toContain('active=true^priority=1');
    expect(result.content[0].text).toContain('matching query');
  });

  it('should not include query when not provided', () => {
    const result = buildEmptyResultResponse('incident');

    expect(result.content[0].text).not.toContain('matching query');
    expect(result.content[0].text).toMatch(/No records found in table "incident"\./);
  });

  it('should have isError: false for empty results', () => {
    const result = buildEmptyResultResponse('sys_user', 'email=nonexistent@example.com');

    // This is the critical test - empty results are NOT errors
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('No records found');
  });
});
