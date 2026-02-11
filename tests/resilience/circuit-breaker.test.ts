/**
 * Unit tests for CircuitBreaker
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  CircuitOpenError,
  DEFAULT_CIRCUIT_CONFIG,
} from '../../src/resilience/circuit-breaker.js';
import { ServiceNowHttpError } from '../../src/client/types.js';

describe('CircuitBreaker', () => {
  describe('Constructor and Configuration', () => {
    it('should start in CLOSED state', () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      expect(breaker.currentState).toBe(CircuitState.CLOSED);
    });

    it('should start with zero failures', () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      expect(breaker.failures).toBe(0);
    });

    it('should use default configuration', () => {
      const breaker = new CircuitBreaker();
      const config = breaker.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.failureThreshold).toBe(5);
      expect(config.resetTimeoutMs).toBe(30000);
    });

    it('should use custom configuration', () => {
      const breaker = new CircuitBreaker({
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 10000,
      });
      const config = breaker.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.failureThreshold).toBe(3);
      expect(config.resetTimeoutMs).toBe(10000);
    });
  });

  describe('Config-Gated Bypass', () => {
    it('should bypass circuit breaker when disabled', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: false });
      const operation = vi.fn().mockResolvedValue('success');

      const result = await breaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should allow all failures when disabled', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: false });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      // Make 10 failing requests (more than threshold)
      for (let i = 0; i < 10; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow(error);
      }

      // Circuit should still be closed (bypassed)
      expect(breaker.currentState).toBe(CircuitState.CLOSED);
      expect(operation).toHaveBeenCalledTimes(10);
    });
  });

  describe('CLOSED State', () => {
    it('should allow requests in CLOSED state', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const operation = vi.fn().mockResolvedValue('success');

      const result = await breaker.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should increment failure count on server errors', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);

      expect(breaker.failures).toBe(1);
      expect(breaker.currentState).toBe(CircuitState.CLOSED);
    });

    it('should reset failure count on success', async () => {
      const breaker = new CircuitBreaker({
        enabled: true,
        failureThreshold: 5,
        resetTimeoutMs: 30000,
      });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);

      // Fail 3 times
      const failOp = vi.fn().mockRejectedValue(error);
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(failOp)).rejects.toThrow(error);
      }

      expect(breaker.failures).toBe(3);

      // Succeed once
      const successOp = vi.fn().mockResolvedValue('success');
      await breaker.execute(successOp);

      // Failure count should reset
      expect(breaker.failures).toBe(0);
      expect(breaker.currentState).toBe(CircuitState.CLOSED);
    });
  });

  describe('CLOSED -> OPEN Transition', () => {
    it('should open circuit after reaching failure threshold', async () => {
      const breaker = new CircuitBreaker({
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 30000,
      });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow(error);
      }

      expect(breaker.currentState).toBe(CircuitState.OPEN);
      expect(breaker.failures).toBe(3);
    });

    it('should count only circuit-breaking errors', async () => {
      const breaker = new CircuitBreaker({
        enabled: true,
        failureThreshold: 3,
        resetTimeoutMs: 30000,
      });
      const mockHeaders = new Headers();

      // 4xx errors should NOT count
      const error404 = new ServiceNowHttpError(404, 'Not Found', '', mockHeaders);
      const op404 = vi.fn().mockRejectedValue(error404);

      await expect(breaker.execute(op404)).rejects.toThrow(error404);
      expect(breaker.failures).toBe(0); // Not counted

      // 5xx errors SHOULD count
      const error500 = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const op500 = vi.fn().mockRejectedValue(error500);

      await expect(breaker.execute(op500)).rejects.toThrow(error500);
      expect(breaker.failures).toBe(1); // Counted
    });
  });

  describe('OPEN State (Fast Fail)', () => {
    it('should fail fast when circuit is open', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);

      const breaker = new CircuitBreaker(
        {
          enabled: true,
          failureThreshold: 2,
          resetTimeoutMs: 30000,
        },
        mockNow,
      );

      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      // Trip the circuit (2 failures)
      for (let i = 0; i < 2; i++) {
        await expect(breaker.execute(operation)).rejects.toThrow(error);
      }

      expect(breaker.currentState).toBe(CircuitState.OPEN);

      // Next request should fail fast without calling operation
      await expect(breaker.execute(operation)).rejects.toThrow(CircuitOpenError);
      expect(operation).toHaveBeenCalledTimes(2); // Not called on 3rd attempt
    });

    it('should throw CircuitOpenError with remaining time', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);

      const breaker = new CircuitBreaker(
        {
          enabled: true,
          failureThreshold: 1,
          resetTimeoutMs: 30000,
        },
        mockNow,
      );

      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      // Trip the circuit
      await expect(breaker.execute(operation)).rejects.toThrow(error);

      // Advance 10 seconds
      currentTime += 10000;

      // Circuit should still be open, with 20 seconds remaining
      try {
        await breaker.execute(operation);
        expect.fail('Should have thrown CircuitOpenError');
      } catch (err) {
        expect(err).toBeInstanceOf(CircuitOpenError);
        const circuitError = err as CircuitOpenError;
        expect(circuitError.remainingMs).toBe(20000);
        expect(circuitError.message).toContain('Reset in 20s');
      }
    });
  });

  describe('OPEN -> HALF_OPEN Transition', () => {
    it('should transition to HALF_OPEN after reset timeout', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);

      const breaker = new CircuitBreaker(
        {
          enabled: true,
          failureThreshold: 1,
          resetTimeoutMs: 10000,
        },
        mockNow,
      );

      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const failOp = vi.fn().mockRejectedValue(error);

      // Trip the circuit
      await expect(breaker.execute(failOp)).rejects.toThrow(error);
      expect(breaker.currentState).toBe(CircuitState.OPEN);

      // Advance time past reset timeout
      currentTime += 10000;

      // Next request should transition to HALF_OPEN
      const successOp = vi.fn().mockResolvedValue('success');
      await breaker.execute(successOp);

      expect(breaker.currentState).toBe(CircuitState.CLOSED); // Success closes it
      expect(successOp).toHaveBeenCalledTimes(1); // Probe was executed
    });
  });

  describe('HALF_OPEN State', () => {
    it('should close circuit on successful probe', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);

      const breaker = new CircuitBreaker(
        {
          enabled: true,
          failureThreshold: 1,
          resetTimeoutMs: 10000,
        },
        mockNow,
      );

      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const failOp = vi.fn().mockRejectedValue(error);

      // Trip the circuit
      await expect(breaker.execute(failOp)).rejects.toThrow(error);

      // Advance to allow reset
      currentTime += 10000;

      // Successful probe should close circuit
      const successOp = vi.fn().mockResolvedValue('recovered');
      const result = await breaker.execute(successOp);

      expect(result).toBe('recovered');
      expect(breaker.currentState).toBe(CircuitState.CLOSED);
      expect(breaker.failures).toBe(0);
    });

    it('should re-open circuit on failed probe', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);

      const breaker = new CircuitBreaker(
        {
          enabled: true,
          failureThreshold: 1,
          resetTimeoutMs: 10000,
        },
        mockNow,
      );

      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const failOp = vi.fn().mockRejectedValue(error);

      // Trip the circuit
      await expect(breaker.execute(failOp)).rejects.toThrow(error);
      expect(breaker.currentState).toBe(CircuitState.OPEN);

      // Advance to allow reset
      currentTime += 10000;

      // Failed probe should re-open circuit
      await expect(breaker.execute(failOp)).rejects.toThrow(error);
      expect(breaker.currentState).toBe(CircuitState.OPEN);

      // Next request should fail fast
      await expect(breaker.execute(failOp)).rejects.toThrow(CircuitOpenError);
    });
  });

  describe('Error Classification', () => {
    it('should count HTTP 500 as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(1);
    });

    it('should count HTTP 502 as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(502, 'Bad Gateway', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(1);
    });

    it('should count HTTP 503 as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(503, 'Service Unavailable', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(1);
    });

    it('should NOT count HTTP 400 as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(400, 'Bad Request', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(0); // Not counted
    });

    it('should NOT count HTTP 401 as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(401, 'Unauthorized', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(0);
    });

    it('should NOT count HTTP 404 as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(404, 'Not Found', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(0);
    });

    it('should NOT count HTTP 429 as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(429, 'Too Many Requests', '', mockHeaders);
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(0); // 429 is handled by rate limiter
    });

    it('should count TypeError (network error) as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const error = new TypeError('Failed to fetch');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(1);
    });

    it('should count AbortError (timeout) as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(1);
    });

    it('should NOT count generic errors as circuit-breaking', async () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_CONFIG, enabled: true });
      const error = new Error('Some application error');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(breaker.execute(operation)).rejects.toThrow(error);
      expect(breaker.failures).toBe(0);
    });
  });

  describe('Complete State Machine Flow', () => {
    it('should complete full cycle: CLOSED -> OPEN -> HALF_OPEN -> CLOSED', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);

      const breaker = new CircuitBreaker(
        {
          enabled: true,
          failureThreshold: 2,
          resetTimeoutMs: 10000,
        },
        mockNow,
      );

      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);

      // CLOSED state
      expect(breaker.currentState).toBe(CircuitState.CLOSED);

      // Fail twice to open circuit
      const failOp = vi.fn().mockRejectedValue(error);
      await expect(breaker.execute(failOp)).rejects.toThrow(error);
      await expect(breaker.execute(failOp)).rejects.toThrow(error);

      // OPEN state
      expect(breaker.currentState).toBe(CircuitState.OPEN);

      // Fast fail
      await expect(breaker.execute(failOp)).rejects.toThrow(CircuitOpenError);

      // Advance time to allow reset
      currentTime += 10000;

      // HALF_OPEN state (implicitly transitions on next request)
      const successOp = vi.fn().mockResolvedValue('success');
      await breaker.execute(successOp);

      // CLOSED state (probe succeeded)
      expect(breaker.currentState).toBe(CircuitState.CLOSED);
      expect(breaker.failures).toBe(0);
    });

    it('should complete cycle: CLOSED -> OPEN -> HALF_OPEN -> OPEN', async () => {
      let currentTime = 0;
      const mockNow = vi.fn(() => currentTime);

      const breaker = new CircuitBreaker(
        {
          enabled: true,
          failureThreshold: 1,
          resetTimeoutMs: 10000,
        },
        mockNow,
      );

      const mockHeaders = new Headers();
      const error = new ServiceNowHttpError(500, 'Internal Server Error', '', mockHeaders);
      const failOp = vi.fn().mockRejectedValue(error);

      // CLOSED -> OPEN
      await expect(breaker.execute(failOp)).rejects.toThrow(error);
      expect(breaker.currentState).toBe(CircuitState.OPEN);

      // Advance time
      currentTime += 10000;

      // HALF_OPEN -> OPEN (probe fails)
      await expect(breaker.execute(failOp)).rejects.toThrow(error);
      expect(breaker.currentState).toBe(CircuitState.OPEN);

      // Still open
      await expect(breaker.execute(failOp)).rejects.toThrow(CircuitOpenError);
    });
  });
});
