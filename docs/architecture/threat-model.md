# Threat Model

## Meta

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Phase | 2 |
| Methodology | STRIDE |
| Created | 2026-02-11 |
| Author Role | Security Engineer |

---

## System Boundary

```
┌──────────────────────────────────────────────────────────────┐
│ Trust Boundary: MCP Server Process                           │
│                                                              │
│  ┌──────────┐   ┌────────────┐   ┌───────────────────────┐  │
│  │ Transport │──▶│ MCP Server │──▶│ Module Registry       │  │
│  │ (stdio/   │   │ (validate  │   │ (feature flag gating) │  │
│  │  HTTP)    │   │  inputs)   │   └───────────┬───────────┘  │
│  └──────────┘   └────────────┘               │              │
│                                    ┌──────────▼──────────┐   │
│                                    │ ServiceNow Client   │   │
│                                    │ (auth + resilience)  │   │
│                                    └──────────┬──────────┘   │
└───────────────────────────────────────────────┼──────────────┘
                                                │
                              ┌─────────────────▼─────────────┐
                              │ ServiceNow Instance (External) │
                              └───────────────────────────────┘
```

---

## STRIDE Analysis

### S — Spoofing

| Threat | Risk | Mitigation | Status |
|--------|------|------------|--------|
| **T-S1**: Attacker sends MCP messages impersonating legitimate client via stdio | Low | stdio transport is local process — only the parent process can communicate | Mitigated by design |
| **T-S2**: Attacker sends MCP messages via HTTP transport without authentication | Medium | HTTP transport requires session management; implement session tokens | Planned (FR-003) |
| **T-S3**: Attacker steals ServiceNow credentials from environment variables | Medium | Credentials only in env vars (never in code); process-level access control | Mitigated (NFR-004) |
| **T-S4**: Attacker intercepts OAuth tokens in transit | Low | All ServiceNow communication over HTTPS | Mitigated by HTTPS |

### T — Tampering

| Threat | Risk | Mitigation | Status |
|--------|------|------------|--------|
| **T-T1**: MCP client sends malformed tool inputs to bypass validation | Medium | All inputs validated via Zod schemas before processing | Planned (NFR-005) |
| **T-T2**: SQL/query injection via `sysparm_query` parameter | Medium | Sanitize query parameter values; validate against injection patterns | Planned (NFR-005) |
| **T-T3**: Table name injection (accessing restricted tables) | Medium | Optional table allowlist in config; validate table name format (alphanumeric + underscore) | Planned (NFR-005) |
| **T-T4**: sys_id manipulation (accessing unauthorized records) | Low | sys_id validated as 32-char hex; authorization delegated to ServiceNow ACLs | Partially mitigated |
| **T-T5**: Unauthorized write operations via MCP tools | High | Write tools only registered when `allow_write=true`; if disabled, tools don't exist | Planned (FR-026) |

### R — Repudiation

| Threat | Risk | Mitigation | Status |
|--------|------|------------|--------|
| **T-R1**: Tool calls made without audit trail | Medium | All API calls logged with structured JSON (method, table, user context, correlation ID) | Planned (NFR-007) |
| **T-R2**: Error responses without context for debugging | Low | All errors include correlation ID, error code, and context | Planned (FR-025) |

### I — Information Disclosure

| Threat | Risk | Mitigation | Status |
|--------|------|------------|--------|
| **T-I1**: Credentials leaked in log output | High | Logger configured to never log auth headers or credentials; Pino redaction | Planned |
| **T-I2**: ServiceNow internal errors leaked to MCP client | Medium | Error normalizer strips internal details; returns only error code + safe message | Planned (FR-025) |
| **T-I3**: Stack traces exposed in error responses | Medium | Catch all errors; never pass raw exceptions to MCP response | Planned |
| **T-I4**: Sensitive data in ServiceNow responses forwarded without filtering | Low | Field selection (`sysparm_fields`) limits returned data; modules can filter sensitive fields | Partial mitigation |

### D — Denial of Service

| Threat | Risk | Mitigation | Status |
|--------|------|------------|--------|
| **T-D1**: Excessive tool calls exhaust ServiceNow API quota | Medium | Token bucket rate limiter respects API limits (FR-023) | Planned |
| **T-D2**: Large result sets consume excessive memory | Low | `sysparm_limit` enforced with configurable max; default 10, hard max 1000 | Planned |
| **T-D3**: Slow ServiceNow responses block server | Medium | Request timeouts on all HTTP calls; configurable timeout value | Planned |
| **T-D4**: Circuit breaker open state prevents all access | Low | Circuit breaker is optional (config-gated); half-open state allows recovery testing | Planned (FR-024) |

### E — Elevation of Privilege

| Threat | Risk | Mitigation | Status |
|--------|------|------------|--------|
| **T-E1**: MCP client accesses write tools when writes are disabled | High | Write tools not registered when `allow_write=false`; tools literally don't exist in MCP tool list | Planned (FR-026) |
| **T-E2**: Generic module used to bypass domain module restrictions | Medium | Generic module has its own `allow_write` flag (default: `true` for flexibility, but configurable) | Planned (FR-014) |
| **T-E3**: Attacker uses generic module to access sensitive tables | Medium | Optional table allowlist/blocklist in config; documented security guidance | Planned |

---

## Risk Summary

| Risk Level | Count | Action |
|-----------|-------|--------|
| High | 2 (T-T5, T-I1, T-E1) | Must be addressed in v0.1.0 |
| Medium | 9 | Should be addressed in v0.1.0 |
| Low | 6 | Acceptable risk with mitigations |

---

## Security Controls Checklist

| Control | Implementation | Verified By |
|---------|---------------|-------------|
| Input validation (all tool inputs) | Zod schemas | AC-007, AC-008 |
| Credential protection | Environment variables only | NFR-004, RC-001 |
| Write operation control | Per-module `allow_write` flags | AC-002, AC-003, AC-008 |
| Structured audit logging | Pino JSON to stderr | AC-019 |
| Rate limiting | Token bucket algorithm | AC-018 |
| Error sanitization | MCP-compliant error normalizer | AC-009, AC-010, AC-011 |
| HTTPS enforcement | ServiceNow client always uses HTTPS | By design |
| sys_id validation | 32-character hex regex | NFR-005 |
| Table name validation | Alphanumeric + underscore regex | NFR-005 |
| Log credential redaction | Pino redact paths config | Implementation detail |

---

## Recommendations

1. **v0.1.0 (Must Have)**:
   - Implement all Zod input validation (T-T1)
   - Implement write control flags (T-T5, T-E1)
   - Implement credential redaction in logs (T-I1)
   - Implement error normalization (T-I2, T-I3)

2. **v0.1.0 (Should Have)**:
   - Table name validation/sanitization (T-T3)
   - sys_id format validation (T-T4)
   - Query parameter sanitization (T-T2)
   - Request timeout enforcement (T-D3)

3. **v0.2.0 (Future)**:
   - HTTP transport authentication (T-S2)
   - Table allowlist/blocklist (T-E3)
   - Field-level redaction for sensitive ServiceNow data (T-I4)
