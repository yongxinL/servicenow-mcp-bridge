# Parallel Groups

## Overview

Tasks are organized into parallel groups (PG) where all tasks within a group can execute concurrently without dependencies on each other.

---

## PG-1: Project Bootstrap

**Prerequisite:** None
**Tasks:**
- T-1.1.1: Project scaffolding (3h, 12K tokens, Sonnet)

**Duration:** 3h
**Note:** Single task — no parallelization needed.

---

## PG-2: Core Infrastructure

**Prerequisite:** T-1.1.1 (scaffolding complete)
**Tasks:**
- T-1.2.1: Auth strategies (6h, 35K tokens, Sonnet)
- T-1.2.2: HTTP client (5h, 28K tokens, Sonnet)
- T-1.4.2: Logger setup (2h, 12K tokens, Haiku)

**Duration:** 6h (limited by T-1.2.1)
**Parallelization Benefit:** Saves ~5h vs sequential

---

## PG-3: Resilience + Error Handling

**Prerequisite:** T-1.2.2 (HTTP client complete)
**Tasks:**
- T-1.3.1: Rate limiter (3h, 18K tokens, Sonnet)
- T-1.3.2: Retry handler (3h, 18K tokens, Sonnet)
- T-1.3.3: Circuit breaker (3h, 18K tokens, Sonnet)
- T-1.4.1: Error normalizer (4h, 22K tokens, Sonnet)

**Duration:** 4h (limited by T-1.4.1)
**Parallelization Benefit:** Saves ~9h vs sequential

---

## PG-4: Priority Modules

**Prerequisite:** T-1.5.2 (module registry) + T-1.4.1 (error normalizer)
**Tasks:**
- T-2.1.1: Generic module (5h, 30K tokens, Sonnet)
- T-2.2.1: Knowledge Base module (5h, 30K tokens, Sonnet)
- T-2.3.1: Incident module (5h, 30K tokens, Sonnet)

**Duration:** 5h (all equal)
**Parallelization Benefit:** Saves ~10h vs sequential
**Note:** Knowledge Base is user priority #1 but all three can be built in parallel.

---

## PG-5: Extended Modules

**Prerequisite:** T-1.5.2 (module registry) + T-1.4.1 (error normalizer)
**Tasks:**
- T-3.1.1: Change module (4h, 25K tokens, Sonnet)
- T-3.2.1: Problem module (4h, 25K tokens, Sonnet)
- T-3.3.1: CMDB module (4h, 25K tokens, Sonnet)
- T-3.4.1: Catalog module (3h, 20K tokens, Sonnet)
- T-3.5.1: User module (3h, 18K tokens, Haiku)

**Duration:** 4h (limited by Change/Problem/CMDB)
**Parallelization Benefit:** Saves ~14h vs sequential
**Note:** PG-5 can run concurrently with PG-4 since they share the same prerequisites.

---

## PG-6: Test Development

**Prerequisite:** T-1.5.2 (module registry) + T-1.4.1/T-1.4.2 (error + logger)
**Tasks:**
- T-4.1.1: Unit tests for core infrastructure (6h, 35K tokens, Sonnet)
- T-4.1.2: Unit tests for error handling and logging (3h, 18K tokens, Haiku)

**Duration:** 6h (limited by T-4.1.1)
**Parallelization Benefit:** Saves ~3h vs sequential
**Note:** PG-6 can start as soon as core foundation is done, concurrent with PG-4/PG-5.

---

## Summary

| Group | Tasks | Sequential Time | Parallel Time | Savings |
|-------|-------|----------------|---------------|---------|
| PG-1 | 1 | 3h | 3h | 0h |
| PG-2 | 3 | 13h | 6h | 7h |
| PG-3 | 4 | 13h | 4h | 9h |
| PG-4 | 3 | 15h | 5h | 10h |
| PG-5 | 5 | 18h | 4h | 14h |
| PG-6 | 2 | 9h | 6h | 3h |
| **Total** | **18** | **71h** | **28h** | **43h** |

**Total project with parallelization: ~35h effective** (vs ~80h sequential)
