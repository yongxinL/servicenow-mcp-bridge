# Locked Specification

## Meta
| Field | Value |
|-------|-------|
| Version | 1.0 |
| Status | Locked |
| Created | 2026-02-11 |
| Locked Date | 2026-02-11 |
| Skill Tier | Advanced |
| Author Role | Product Manager |
| CodeMaestro Version | 1.0.0 |

## Change Log
| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-11 | Initial specification with clarifications: TypeScript-only (Python = reference), write operation controls, comprehensive error handling, Knowledge Base priority |

---

## Summary (OPT-3: Load This During Phase Transitions)

**Quick Reference (~500 tokens for context efficiency)**

**One-Line:** A Model Context Protocol (MCP) server in Node.js/TypeScript that provides secure, modular, and production-ready access to ServiceNow REST APIs for AI assistants and automation tools, with feature-flag-driven module enablement, multi-strategy authentication, and configurable write-operation controls.

**Domain:** Cloud / API Integration
**Skill Tier:** Advanced
**Technology Stack:** TypeScript/Node.js (Python servers are reference only)

### Requirements Overview
- **Functional Requirements:** 26 total (11 High, 10 Medium, 5 Low priority)
- **Non-Functional Requirements:** 9 total (Performance, Security, Reliability, Scalability, Maintainability, Observability, Data Integrity)
- **Acceptance Criteria:** 21 total (12 High priority, must verify 100%)

### Key Functional Areas
1. **MCP Server Core:** MCP protocol compliance, tool registration, transport support — FR-001 to FR-004
2. **ServiceNow API Client:** Authentication, HTTP communication, query building — FR-005 to FR-009
3. **Module System:** Feature flags, module registry, generic + domain tools — FR-010 to FR-013
4. **Domain Modules:** Knowledge Base (Priority 1), Incident, Change, Problem, CMDB, Catalog, User — FR-014 to FR-021
5. **Resilience Layer:** Retry, rate limiting, circuit breaker, error handling — FR-022 to FR-025
6. **Write Controls & Error Handling:** Write operation controls, comprehensive error handling — FR-026 to FR-027d

### Critical NFRs
- **Performance:** API response relay <500ms P95 (excluding ServiceNow latency)
- **Reliability:** Graceful degradation when ServiceNow is unavailable; zero data loss
- **Security:** Zero credentials in code; all inputs validated; auth strategies isolated; write operations controllable
- **Observability:** Structured JSON logging to stderr; request-level correlation IDs
- **Data Integrity:** Write operations respect config flags; unauthorized writes blocked

### Key Constraints
- **Technical:** Node.js >=20, TypeScript strict mode, ESM modules, MCP SDK v1.x+
- **Protocol:** Must comply with Model Context Protocol specification
- **Language:** TypeScript/Node.js only — Python implementations are reference/inspiration, not direct ports
- **Integration:** ServiceNow REST API (Table API, aggregate API)

### Dependencies
- **Critical:** `@modelcontextprotocol/sdk`, ServiceNow REST API availability
- **Risk:** MCP SDK API stability; mitigated by pinning minor version

### Success Metrics
- **Primary:** All 8 ServiceNow modules (including generic) register and execute tools correctly via MCP protocol
- **Secondary:** Test coverage >=70%, zero critical/high security issues

### Out of Scope (Key Exclusions)
- ServiceNow Scripted REST APIs (custom endpoints)
- Real-time event streaming from ServiceNow (e.g., business rules, webhooks)
- Multi-instance management in a single server process
- GUI/dashboard for configuration

**Full Details:** See complete sections below for detailed requirements, ACs, and verification methods.

---

## One-Line Requirement

> A Model Context Protocol (MCP) server in Node.js/TypeScript that provides secure, modular, and production-ready access to ServiceNow REST APIs for AI assistants and automation tools, with feature-flag-driven module enablement, multi-strategy authentication, and configurable write-operation controls.

---

## Functional Requirements

| ID | Requirement | Priority | Complexity | Notes |
|----|-------------|----------|------------|-------|
| **MCP Server Core** | | | | |
| FR-001 | Server implements MCP protocol via `@modelcontextprotocol/sdk`, creating an `McpServer` instance with name, version, and capabilities metadata | High | Low | Entry point for all MCP communication |
| FR-002 | Server supports stdio transport as the primary communication channel, reserving stdout for MCP protocol and routing all logs to stderr | High | Low | Required for CLI-based MCP clients (Claude Desktop, Cursor) |
| FR-003 | Server supports optional Streamable HTTP transport via Express.js with session management for remote/web deployments | Medium | Medium | Secondary transport; gated behind config flag |
| FR-004 | Server dynamically registers MCP tools at startup based on enabled modules, providing Zod-validated input schemas with `.describe()` annotations for AI discoverability | High | Medium | Tools are the primary MCP interface |
| **ServiceNow API Client** | | | | |
| FR-005 | Client supports Basic Auth strategy (base64 username:password in Authorization header) | High | Low | Simplest auth for development |
| FR-006 | Client supports OAuth 2.0 Client Credentials Grant with automatic token caching and refresh before expiry | High | High | Standard for production ServiceNow integrations |
| FR-007 | Client supports API Token/Bearer Token strategy for static token authentication | Medium | Low | Useful for dev/test environments |
| FR-008 | Client constructs ServiceNow REST API URLs from instance name, building correct paths for Table API (`/api/now/table/{table}`) and Aggregate API (`/api/now/stats/{table}`) | High | Low | Foundation for all API calls |
| FR-009 | Client serializes query parameters including `sysparm_query`, `sysparm_limit`, `sysparm_offset`, `sysparm_fields`, `sysparm_display_value`, and `sysparm_order_by` | High | Medium | ServiceNow-specific query interface |
| **Module System** | | | | |
| FR-010 | Configuration system loads settings with three-tier precedence: environment variables (highest) > local config file > default config file, validated at startup with Zod schemas | High | Medium | Fail-fast on invalid config |
| FR-011 | Module registry reads feature flags from configuration and only registers tools for enabled modules | High | Medium | Core modularity mechanism |
| FR-012 | Each module implements a standard interface (`ServiceNowModule`) with `config` metadata and a `register(server, client)` method | Medium | Low | Enforces consistent module structure |
| FR-013 | New modules can be added by creating a module directory, implementing the interface, and adding to the registry array — no other files require modification | Medium | Low | Extensibility guarantee |
| **Domain Modules — Generic** | | | | |
| FR-014 | Generic module provides `query_records` (read-only) and conditionally provides `create_record`, `update_record`, `delete_record` (write operations controlled by config flag `generic.allow_write`) | High | Medium | Power-user escape hatch; write operations gated |
| FR-014a | Generic module always provides `get_record` (read-only by nature) regardless of write flag | High | Low | Single record read is always safe |
| **Domain Modules — Knowledge Base (PRIORITY 1)** | | | | |
| FR-015 | Knowledge Base module provides `search_knowledge` (read-only), `get_article` (read-only), and conditionally `create_article`, `update_article` (write operations controlled by config flag `knowledge.allow_write`) | High | Medium | **Implement FIRST** — User priority |
| **Domain Modules — Incident** | | | | |
| FR-016 | Incident module provides `list_incidents` (read-only), `get_incident` (read-only), and conditionally `create_incident`, `update_incident`, `resolve_incident`, `add_incident_comment` (write operations controlled by config flag `incident.allow_write`) | High | Medium | Implement AFTER Knowledge Base |
| **Domain Modules — Change** | | | | |
| FR-017 | Change module provides `list_changes` (read-only), `get_change` (read-only), and conditionally `create_change`, `update_change`, `approve_change`, `add_change_task` (write operations controlled by config flag `change.allow_write`) | Medium | Medium | |
| **Domain Modules — Problem** | | | | |
| FR-018 | Problem module provides `list_problems` (read-only), `get_problem` (read-only), and conditionally `create_problem`, `update_problem`, `link_incident_to_problem` (write operations controlled by config flag `problem.allow_write`) | Medium | Medium | Gap in competitor offerings |
| **Domain Modules — CMDB** | | | | |
| FR-019 | CMDB module provides `query_cis` (read-only), `get_ci` (read-only), `get_ci_relationships` (read-only), and conditionally `create_ci`, `update_ci` (write operations controlled by config flag `cmdb.allow_write`) | Medium | Medium | High value for infrastructure teams |
| **Domain Modules — Service Catalog** | | | | |
| FR-020 | Catalog module provides `list_catalog_items` (read-only), `get_catalog_item` (read-only), `get_request_status` (read-only), and conditionally `submit_catalog_request` (write operation controlled by config flag `catalog.allow_write`) | Low | Medium | |
| **Domain Modules — User** | | | | |
| FR-021 | User module provides `search_users` (read-only), `get_user` (read-only), `get_user_groups` (read-only), `get_group_members` (read-only) — no write operations supported (user management is read-only) | Medium | Low | User/group management via MCP is read-only for safety |
| **Resilience Layer** | | | | |
| FR-022 | Retry mechanism wraps ServiceNow API calls with configurable max retries, exponential backoff with jitter, and retryable error detection (429, 503, network errors) | High | Medium | Critical for production reliability |
| FR-023 | Token bucket rate limiter throttles requests to respect ServiceNow API limits (default 1000 req/hour), with configurable burst size | Medium | Medium | Prevents API quota exhaustion |
| FR-024 | Circuit breaker (optional, config-gated) transitions between CLOSED/OPEN/HALF_OPEN states to fail fast during sustained ServiceNow outages | Low | Medium | Advanced resilience pattern |
| FR-025 | All errors from ServiceNow API calls are caught and returned as MCP-compliant `CallToolResult` objects with `isError: true` — never thrown as exceptions | High | Low | MCP specification requirement for AI-friendly errors |
| **Write Controls** | | | | |
| FR-026 | Configuration schema includes per-module `allow_write` boolean flags (default: `false` for all modules except generic which defaults to `true`) that control registration of write operation tools (create/update/delete) | High | Medium | Granular write control per module |
| **Comprehensive Error Handling** | | | | |
| FR-027 | ServiceNow client detects and handles empty result sets (HTTP 200 with empty array) by returning successful MCP result with empty array and metadata indicating "no records found" | High | Low | Explicit empty response handling |
| FR-027a | ServiceNow client detects HTTP 403 (Forbidden) responses and returns MCP error result with code `AUTHORIZATION_ERROR` and message indicating insufficient ServiceNow ACL permissions for the requested table/operation | High | Low | Access denied handling |
| FR-027b | ServiceNow client detects HTTP 404 (Not Found) responses and returns MCP error result with code `NOT_FOUND` and context about the missing resource (table or sys_id) | High | Low | Not found handling |
| FR-027c | ServiceNow client detects HTTP 400 (Bad Request) responses and returns MCP error result with code `VALIDATION_ERROR` including ServiceNow's error details from response body | High | Low | Validation error handling |
| FR-027d | ServiceNow client detects network errors (connection refused, timeout, DNS failure) and returns MCP error result with code `NETWORK_ERROR` | High | Low | Network error handling |

### Priority Definitions
- **High**: Must have for v0.1.0 MVP
- **Medium**: Should have for v0.1.0
- **Low**: Nice to have, can defer to v0.2.0

### Complexity Definitions
- **High**: >8 hours estimated effort
- **Medium**: 4-8 hours
- **Low**: <4 hours

---

## Non-Functional Requirements

| ID | Category | Requirement | Metric | Target | Threshold |
|----|----------|-------------|--------|--------|-----------|
| NFR-001 | Performance | Server-side processing latency (excluding ServiceNow network round-trip) | P95 response time | <100ms | <500ms |
| NFR-002 | Performance | Server startup time from process launch to accepting MCP connections | Startup time | <3s | <5s |
| NFR-003 | Reliability | Server handles ServiceNow unavailability gracefully via retry and circuit breaker, returning structured error results instead of crashing | Uptime under degraded ServiceNow | 99.9% server process uptime | 99% |
| NFR-004 | Security | Zero hardcoded credentials in source code; all secrets via environment variables or config files excluded from version control | Secrets in codebase | 0 | 0 |
| NFR-005 | Security | All tool inputs validated via Zod schemas before reaching ServiceNow client; table names and sys_ids sanitized | Unvalidated inputs reaching API | 0 | 0 |
| NFR-006 | Maintainability | TypeScript strict mode enabled; all public interfaces typed; test coverage meets minimum threshold | Test coverage | 85% line coverage | 70% line coverage |
| NFR-007 | Observability | All ServiceNow API calls logged with structured JSON to stderr, including request method, table, duration, status code, and correlation ID | Log completeness | 100% of API calls logged | 95% |
| NFR-008 | Scalability | Module system supports adding new ServiceNow modules without modifying core server, client, or configuration schema code | Files modified to add module | 1 (registry) | 3 |
| NFR-009 | Data Integrity | Write operations (create/update/delete) are only available when explicitly enabled via per-module `allow_write` config flags; tools for write operations are not registered when flag is false | Unauthorized write tools registered | 0 | 0 |

---

## Acceptance Criteria

| AC ID | Criterion | Linked Req | Verification | Priority |
|-------|-----------|------------|--------------|----------|
| AC-001 | Given a valid configuration with `auth.type=basic`, when the server starts via stdio, then it connects successfully and responds to MCP `initialize` request with server name and version | FR-001, FR-002, FR-005 | Integration Test | High |
| AC-002 | Given a module config with `knowledge.enabled=true`, `knowledge.allow_write=false`, when the server starts, then only read-only knowledge tools (`search_knowledge`, `get_article`) are registered — no `create_article` or `update_article` appear in `tools/list` | FR-011, FR-015, FR-026 | Integration Test | High |
| AC-003 | Given `knowledge.enabled=true` and `knowledge.allow_write=true`, when the server starts, then all knowledge tools including `create_article` and `update_article` are registered | FR-015, FR-026 | Integration Test | High |
| AC-004 | Given a valid ServiceNow instance, when `search_knowledge` is called with a search term, then the server returns a structured result with matching articles including title, short_description, and sys_id | FR-015 | Integration Test | High |
| AC-005 | Given a valid ServiceNow instance, when `create_article` is called with required fields (and `allow_write=true`), then a new knowledge article is created and the response includes the `sys_id` and `number` | FR-015 | Integration Test | High |
| AC-006 | Given a valid ServiceNow instance, when `list_incidents` is called with `state=new` and `limit=5`, then the server returns a structured result with up to 5 incident records filtered by state | FR-016 | Integration Test | High |
| AC-007 | Given any table name, when `query_records` is called with a table, query filter, and field list, then the server returns matching records with only the requested fields | FR-014 | Integration Test | High |
| AC-008 | Given `generic.allow_write=false`, when the server starts, then `create_record`, `update_record`, `delete_record` tools are NOT registered; only `query_records` and `get_record` are available | FR-014, FR-014a, FR-026 | Integration Test | High |
| AC-009 | Given invalid credentials, when any tool is called, then the server returns an MCP error result with `isError: true` and error code `AUTHENTICATION_ERROR` — the server does not crash | FR-025, FR-005 | Automated Test | High |
| AC-010 | Given ServiceNow returns HTTP 403 (Forbidden) for a table access, when any tool queries that table, then the server returns an MCP error result with code `AUTHORIZATION_ERROR` and a message about insufficient ACL permissions | FR-027a | Automated Test | High |
| AC-011 | Given ServiceNow returns HTTP 404 for a record lookup, when `get_record` or `get_incident` is called with a non-existent sys_id, then the server returns an MCP error result with code `NOT_FOUND` | FR-027b | Automated Test | High |
| AC-012 | Given ServiceNow returns HTTP 200 with an empty result array, when any list/query tool is called, then the server returns a successful MCP result with an empty array and metadata indicating "no records found" | FR-027 | Automated Test | High |
| AC-013 | Given ServiceNow returns HTTP 429 (rate limited), when a tool call is in progress, then the retry mechanism retries up to `max_retries` times with exponential backoff before returning a rate limit error result | FR-022 | Automated Test | High |
| AC-014 | Given an OAuth configuration, when the server starts and makes API calls, then it obtains an access token, caches it, and refreshes it before expiry without requiring manual intervention | FR-006 | Automated Test | High |
| AC-015 | Given environment variable `SERVICENOW_INSTANCE=mydev` and config file with `servicenow.instance=myprod`, when config is loaded, then `servicenow.instance` resolves to `mydev` (env var wins) | FR-010 | Automated Test | High |
| AC-016 | Given all configuration values missing, when the server starts, then it fails with a descriptive Zod validation error message listing all missing required fields — it does not start with partial config | FR-010 | Automated Test | High |
| AC-017 | Given the circuit breaker is enabled and ServiceNow returns 5 consecutive 500 errors, when the next tool call is made, then the circuit breaker opens and immediately returns a `CIRCUIT_OPEN` error without making an API call | FR-024 | Automated Test | Medium |
| AC-018 | Given the rate limiter is configured for 100 req/hour, when 100 requests are made in rapid succession, then subsequent requests are delayed until tokens refill — no requests are dropped | FR-023 | Automated Test | Medium |
| AC-019 | Given the server is running, when any ServiceNow API call is made, then a structured JSON log entry is written to stderr containing method, table, duration_ms, status_code, and correlation_id | NFR-007 | Automated Test | Medium |
| AC-020 | Given a network timeout occurs during a ServiceNow API call, when the timeout is detected, then the server returns an MCP error result with code `NETWORK_ERROR` and does not hang indefinitely | FR-027d | Automated Test | High |
| AC-021 | Given a new module directory with `index.ts` and `tools.ts` implementing `ServiceNowModule`, when it is added to the `ALL_MODULES` array, then its tools are registered when the feature flag is enabled — no other files are modified | FR-013, NFR-008 | Manual Review | Medium |
| AC-014 | Given the change module is enabled, when `create_change` is called with required fields, then a change request is created in ServiceNow and the response includes `sys_id` and `number` | FR-016 | Integration Test | Medium |
| AC-015 | Given a CMDB module is enabled, when `get_ci_relationships` is called with a CI sys_id, then the server returns related CIs from the `cmdb_rel_ci` table | FR-018 | Integration Test | Medium |
| AC-016 | Given the knowledge module is enabled, when `search_knowledge` is called with a search query, then matching knowledge articles are returned with title, body excerpt, and sys_id | FR-020 | Integration Test | Medium |
| AC-017 | Given the server is running, when any ServiceNow API call is made, then a structured JSON log entry is written to stderr containing method, table, duration_ms, status_code, and correlation_id | NFR-007 | Automated Test | Medium |
| AC-018 | Given a new module directory with `index.ts` and `tools.ts` implementing `ServiceNowModule`, when it is added to the `ALL_MODULES` array, then its tools are registered when the feature flag is enabled — no other files are modified | FR-013, NFR-008 | Manual Review | Medium |

### Verification Methods
- **Automated Test**: Unit test with mocked ServiceNow responses (vitest)
- **Integration Test**: End-to-end test using in-memory MCP transport with mock HTTP responses
- **Load Test**: Performance testing with concurrent tool calls (future, post-v0.1.0)
- **Manual Review**: Code review and architecture verification

---

## Constraints

### Technical Constraints
| ID | Constraint | Rationale | Impact |
|----|------------|-----------|--------|
| TC-001 | Node.js >=20.0.0 LTS | Required for native `fetch`, ES2022 features, stable ESM support | Minimum runtime version |
| TC-002 | TypeScript strict mode with ESM (`"type": "module"`) | MCP SDK requires ESM; strict mode enforces type safety | All imports use `.js` extensions |
| TC-003 | `@modelcontextprotocol/sdk` v1.x as MCP protocol implementation | Official SDK; only supported TypeScript MCP server library | API surface tied to SDK version |
| TC-004 | Zod v3.x for schema validation | Required by MCP SDK for tool input schemas | Single validation library |
| TC-005 | All logging to stderr; stdout reserved for MCP protocol messages | MCP specification requirement — protocol messages flow over stdout/stdin in stdio transport | Cannot use `console.log()` for debugging |
| TC-006 | ServiceNow REST API (Table API and Aggregate API) as the only integration surface | Covers all planned modules; avoids dependency on ServiceNow-specific APIs that may require additional licensing | Limits to standard API operations |
| TC-007 | TypeScript/Node.js implementation only — Python servers are reference/inspiration, not ports | MCP ecosystem is TypeScript-native; align with ecosystem tooling and `@modelcontextprotocol/sdk` | No Python code or direct ports |

### Business Constraints
| ID | Constraint | Rationale | Impact |
|----|------------|-----------|--------|
| BC-001 | Open source under Apache 2.0 license | Aligns with MCP ecosystem norms; enables enterprise adoption | No proprietary dependencies |
| BC-002 | Single-instance architecture (one server connects to one ServiceNow instance) | Simplifies configuration and security model for v0.1.0 | Multi-instance support deferred |

### Regulatory Constraints
| ID | Regulation | Requirement | Verification |
|----|------------|-------------|--------------|
| RC-001 | Enterprise Security Best Practices | No credentials in source code; secrets only via environment variables or gitignored config files | Automated scan of committed files; `.gitignore` includes `.env`, `config/local.json` |

---

## Assumptions

| ID | Assumption | Risk if Invalid | Mitigation |
|----|------------|-----------------|------------|
| A-001 | ServiceNow instances expose the standard REST Table API at `/api/now/table/{table}` | Core functionality fails | Verify API endpoint format against ServiceNow documentation; make base path configurable |
| A-002 | MCP SDK v1.x `McpServer.registerTool()` API is stable and supports Zod v3 schemas | Major refactoring required if SDK changes | Pin SDK version in package.json; monitor SDK changelog |
| A-003 | Target users have a ServiceNow instance with REST API access enabled and appropriate ACLs configured | Authentication succeeds but operations fail with 403 | Document required ServiceNow roles and ACLs in README |
| A-004 | ServiceNow rate limits are approximately 1000 requests/hour per user by default | Rate limiter defaults may be too aggressive or lenient | Make rate limit configurable; respect `Retry-After` header from 429 responses |
| A-005 | OAuth 2.0 Client Credentials grant is the standard server-to-server auth pattern for ServiceNow | OAuth flow may differ per instance configuration | Support Resource Owner Password grant as fallback; document OAuth setup requirements |

---

## Out of Scope

| Item | Rationale | Future Phase? |
|------|-----------|---------------|
| ServiceNow Scripted REST APIs (custom endpoints) | Requires instance-specific knowledge; not standardizable | Yes (v0.3.0+) |
| Real-time event streaming (business rules, webhooks, AMB) | Different integration pattern; not request-response | Yes (v0.3.0+) |
| Multi-instance management (connect to multiple ServiceNow instances simultaneously) | Adds significant complexity to config and auth management | Yes (v0.2.0) |
| GUI/dashboard for server configuration | CLI-first approach aligns with MCP ecosystem; config via files and env vars | No |
| Agile Management module (stories, epics, scrum tasks) | Lower priority; covered by echelon-ai-labs for Python users | Yes (v0.2.0) |
| Workflow and Script Include management | Platform admin tools; niche use case | Yes (v0.2.0) |
| MCP Resources (exposing ServiceNow data as MCP resources) | Tools are the primary interface for v0.1.0; resources add complexity | Yes (v0.2.0) |
| MCP Prompts (pre-built prompt templates) | Lower priority than tools; can be added incrementally | Yes (v0.2.0) |
| ServiceNow attachment handling (file upload/download) | Requires multipart form handling; separate concern | Yes (v0.2.0) |

---

## Dependencies

### External Dependencies
| Dependency | Type | Risk | Mitigation |
|------------|------|------|------------|
| `@modelcontextprotocol/sdk` | npm package | Medium — API may change across minor versions | Pin to `^1.12.x`; test against SDK updates |
| ServiceNow REST API | External API | Low — stable, well-documented enterprise API | Timeout and retry configuration; circuit breaker for outages |
| `zod` v3.x | npm package | Low — mature, stable library | Pin to `^3.24.x` |
| `pino` | npm package | Low — mature logging library | Pin to `^9.x` |
| Node.js >=20 | Runtime | Low — current LTS | Document minimum version; test on CI |

---

## Glossary

| Term | Definition |
|------|------------|
| MCP | Model Context Protocol — open standard for AI assistant tool integration |
| MCP Tool | A function exposed by an MCP server that AI assistants can invoke with structured inputs |
| MCP Client | An application (Claude Desktop, Cursor, etc.) that connects to MCP servers to use their tools |
| ServiceNow Table API | REST API at `/api/now/table/{table}` for CRUD operations on ServiceNow tables |
| sys_id | ServiceNow's globally unique identifier for every record (32-character hex string) |
| sysparm_query | ServiceNow query parameter for filtering records using encoded query syntax |
| Feature Flag | Configuration toggle that enables/disables a specific ServiceNow module's tools |
| stdio Transport | MCP communication over stdin/stdout, used when the MCP client spawns the server as a child process |
| Streamable HTTP Transport | MCP communication over HTTP POST with session management, used for remote server deployments |
| Circuit Breaker | Resilience pattern that stops making API calls after repeated failures, allowing the service to recover |
| Token Bucket | Rate limiting algorithm that allows bursts up to a configured size while maintaining a steady average rate |

---

## Appendix: Selected Interpretation

### Draft Selected: TypeScript Hybrid MCP Server

**Rationale**: TypeScript is the native language of the MCP ecosystem (`@modelcontextprotocol/sdk`). A hybrid approach combining generic table operations with domain-specific tools provides the best balance of flexibility and AI ergonomics. This positions the project as the first TypeScript ServiceNow MCP server with enterprise-grade resilience — filling a clear gap in the market identified during competitive analysis.

**Trade-offs**:
- TypeScript over Python means we cannot reuse code from either competitor, but gains native MCP SDK compatibility and type safety
- Hybrid tool model (generic + domain) increases implementation scope but delivers more value than either approach alone
- Including resilience patterns (retry, rate limit, circuit breaker) adds ~20% implementation effort but is critical for enterprise trust

### Rejected Alternatives

| Draft | Reason |
|-------|--------|
| Python implementation (following competitors) | Both competitors are Python; no differentiation. MCP ecosystem is TypeScript-primary. |
| Generic-only tools (no domain modules) | Generic tools require users to know ServiceNow table/field names; poor AI experience. Domain tools with semantic parameters are more AI-friendly. |
| Domain-only tools (no generic module) | Limits users to pre-built modules; no escape hatch for custom tables. Echelon-ai-labs took this approach and it's a documented weakness. |
