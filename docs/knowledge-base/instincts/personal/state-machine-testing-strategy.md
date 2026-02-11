---
id: state-machine-testing-strategy
trigger: "when implementing state machines (circuit breaker, connection pools, workflows)"
confidence: 0.8
domain: "testing"
source: "session-observation"
phase: "3"
created: "2026-02-12"
last_reinforced: "2026-02-12"
tags: ["testing", "state-machine", "circuit-breaker", "transitions", "coverage"]
---

# State Machine Testing Strategy: Transitions + Full Cycles

## Action

When testing state machines, write tests for **each individual transition** AND **complete state cycles**. This ensures both correctness of each transition and proper end-to-end behavior.

## Evidence

- Circuit breaker testing in T-1.3.3 demonstrated this pattern
- 28 tests covering all transitions and cycles
- Three states (CLOSED, OPEN, HALF_OPEN) with 6 transitions
- Individual transition tests caught edge cases
- Full cycle tests verified complete flows

## Testing Layers

### Layer 1: Individual Transitions

Test each state transition in isolation with clear preconditions.

```typescript
// ✅ PREFER: Test each transition separately

describe('CLOSED -> OPEN Transition', () => {
  it('should open circuit after reaching failure threshold', () => {
    // Start in CLOSED, trigger failures, verify OPEN
  });
});

describe('OPEN -> HALF_OPEN Transition', () => {
  it('should transition to HALF_OPEN after reset timeout', () => {
    // Start in OPEN, advance time, verify HALF_OPEN
  });
});

describe('HALF_OPEN -> CLOSED Transition', () => {
  it('should close circuit on successful probe', () => {
    // Start in HALF_OPEN, succeed, verify CLOSED
  });
});

describe('HALF_OPEN -> OPEN Transition', () => {
  it('should re-open circuit on failed probe', () => {
    // Start in HALF_OPEN, fail, verify OPEN
  });
});
```

### Layer 2: Complete Cycles

Test full state machine cycles to verify end-to-end behavior.

```typescript
// ✅ PREFER: Test complete cycles

describe('Complete State Machine Flow', () => {
  it('should complete full cycle: CLOSED -> OPEN -> HALF_OPEN -> CLOSED', () => {
    // Verify happy path recovery
    expect(breaker.currentState).toBe(CircuitState.CLOSED);

    // Trigger failures -> OPEN
    triggerFailures();
    expect(breaker.currentState).toBe(CircuitState.OPEN);

    // Wait for reset -> HALF_OPEN (implicit)
    advanceTime();

    // Successful probe -> CLOSED
    succeedProbe();
    expect(breaker.currentState).toBe(CircuitState.CLOSED);
  });

  it('should handle failure cycle: CLOSED -> OPEN -> HALF_OPEN -> OPEN', () => {
    // Verify probe failure handling
  });
});
```

### Layer 3: State-Specific Behavior

Test behavior specific to each state.

```typescript
describe('OPEN State (Fast Fail)', () => {
  it('should fail fast without executing operation', () => {
    tripCircuit();
    expect(breaker.currentState).toBe(CircuitState.OPEN);

    // Verify operation is NOT called
    const operation = vi.fn();
    expect(() => breaker.execute(operation)).toThrow(CircuitOpenError);
    expect(operation).not.toHaveBeenCalled(); // Fast fail!
  });
});

describe('CLOSED State', () => {
  it('should reset counter on success', () => {
    failSeveralTimes();
    succeedOnce();
    expect(breaker.failures).toBe(0); // Counter reset
  });
});
```

## State Machine Test Checklist

- [ ] Test each state transition individually
- [ ] Test all complete state cycles (happy paths)
- [ ] Test all failure cycles (unhappy paths)
- [ ] Test behavior specific to each state
- [ ] Test invalid transitions (should not occur)
- [ ] Test edge cases (threshold boundaries, timing)
- [ ] Test state persistence if applicable
- [ ] Test concurrent access if applicable

## Benefits

1. **Comprehensive coverage**: All transitions and cycles verified
2. **Easier debugging**: Failing test identifies specific transition
3. **Documentation**: Tests serve as state machine documentation
4. **Regression prevention**: Changes can't break transitions silently

## When to Apply

- Circuit breakers (CLOSED/OPEN/HALF_OPEN)
- Connection pools (IDLE/ACTIVE/CLOSED)
- Workflow engines (PENDING/RUNNING/COMPLETE/FAILED)
- Authentication flows (UNAUTHENTICATED/AUTHENTICATING/AUTHENTICATED)
- WebSocket connections (CONNECTING/OPEN/CLOSING/CLOSED)

## Example Test Organization

```typescript
describe('CircuitBreaker State Machine', () => {
  describe('Individual Transitions', () => {
    describe('CLOSED -> OPEN', () => { /* ... */ });
    describe('OPEN -> HALF_OPEN', () => { /* ... */ });
    describe('HALF_OPEN -> CLOSED', () => { /* ... */ });
    describe('HALF_OPEN -> OPEN', () => { /* ... */ });
  });

  describe('Complete Cycles', () => {
    it('happy path: CLOSED -> OPEN -> HALF_OPEN -> CLOSED', () => { /* ... */ });
    it('failure path: CLOSED -> OPEN -> HALF_OPEN -> OPEN', () => { /* ... */ });
  });

  describe('State-Specific Behavior', () => {
    describe('CLOSED', () => { /* ... */ });
    describe('OPEN', () => { /* ... */ });
    describe('HALF_OPEN', () => { /* ... */ });
  });
});
```

## Related Patterns

- Time injection for testing time-based transitions
- Fake timers for instant time advancement
- State getters for observability in tests
