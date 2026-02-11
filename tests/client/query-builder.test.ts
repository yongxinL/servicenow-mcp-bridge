/**
 * Unit tests for query parameter builder
 */

import { describe, it, expect } from 'vitest';
import { buildQueryString } from '../../src/client/query-builder.js';

describe('buildQueryString', () => {
  it('should return empty string for undefined params', () => {
    expect(buildQueryString(undefined)).toBe('');
  });

  it('should return empty string for empty params object', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('should serialize single parameter', () => {
    const result = buildQueryString({ sysparm_limit: 10 });
    expect(result).toBe('sysparm_limit=10');
  });

  it('should serialize multiple parameters', () => {
    const result = buildQueryString({
      sysparm_limit: 10,
      sysparm_offset: 20,
    });

    const params = new URLSearchParams(result);
    expect(params.get('sysparm_limit')).toBe('10');
    expect(params.get('sysparm_offset')).toBe('20');
  });

  it('should omit undefined values', () => {
    const result = buildQueryString({
      sysparm_limit: 10,
      sysparm_offset: undefined,
      sysparm_fields: 'name,email',
    });

    const params = new URLSearchParams(result);
    expect(params.get('sysparm_limit')).toBe('10');
    expect(params.get('sysparm_offset')).toBeNull();
    expect(params.get('sysparm_fields')).toBe('name,email');
  });

  it('should handle sysparm_query parameter', () => {
    const result = buildQueryString({
      sysparm_query: 'active=true^priority=1',
    });

    const params = new URLSearchParams(result);
    expect(params.get('sysparm_query')).toBe('active=true^priority=1');
  });

  it('should handle sysparm_fields parameter', () => {
    const result = buildQueryString({
      sysparm_fields: 'sys_id,number,short_description',
    });

    const params = new URLSearchParams(result);
    expect(params.get('sysparm_fields')).toBe(
      'sys_id,number,short_description',
    );
  });

  it('should handle sysparm_display_value parameter', () => {
    const result = buildQueryString({
      sysparm_display_value: 'all',
    });

    const params = new URLSearchParams(result);
    expect(params.get('sysparm_display_value')).toBe('all');
  });

  it('should handle sysparm_order_by parameter', () => {
    const result = buildQueryString({
      sysparm_order_by: 'sys_created_onDESC',
    });

    const params = new URLSearchParams(result);
    expect(params.get('sysparm_order_by')).toBe('sys_created_onDESC');
  });

  it('should URL-encode special characters', () => {
    const result = buildQueryString({
      sysparm_query: 'name=John Doe',
    });

    // URLSearchParams handles encoding
    expect(result).toContain('sysparm_query=name%3DJohn+Doe');
  });

  it('should handle all parameters together', () => {
    const result = buildQueryString({
      sysparm_query: 'active=true',
      sysparm_limit: 50,
      sysparm_offset: 100,
      sysparm_fields: 'sys_id,number',
      sysparm_display_value: 'true',
      sysparm_order_by: 'number',
    });

    const params = new URLSearchParams(result);
    expect(params.get('sysparm_query')).toBe('active=true');
    expect(params.get('sysparm_limit')).toBe('50');
    expect(params.get('sysparm_offset')).toBe('100');
    expect(params.get('sysparm_fields')).toBe('sys_id,number');
    expect(params.get('sysparm_display_value')).toBe('true');
    expect(params.get('sysparm_order_by')).toBe('number');
  });

  it('should convert numbers to strings', () => {
    const result = buildQueryString({
      sysparm_limit: 25,
      sysparm_offset: 0,
    });

    const params = new URLSearchParams(result);
    expect(params.get('sysparm_limit')).toBe('25');
    expect(params.get('sysparm_offset')).toBe('0');
  });
});
