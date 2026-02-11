# Technology Stack

## Meta

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Phase | 2 |
| Created | 2026-02-11 |
| Verification Method | Context7 + Official Documentation |

---

## Core Runtime

### Node.js

| Field | Value |
|-------|-------|
| Version | >=20.0.0 LTS |
| Constraint | TC-001 |
| Rationale | Native `fetch`, ES2022, stable ESM support |
| Verification | Runtime requirement; no Context7 lookup needed |

### TypeScript

| Field | Value |
|-------|-------|
| Version | ^5.x |
| Mode | Strict mode, ESM (`"type": "module"`) |
| Constraint | TC-002 |
| Rationale | Type safety, MCP ecosystem alignment |

---

## Dependencies

### @modelcontextprotocol/sdk

| Field | Value |
|-------|-------|
| Version | ^1.12.x |
| Context7 ID | /modelcontextprotocol/typescript-sdk |
| Verification Date | 2026-02-11 |
| API Confirmed | Yes |
| Constraint | TC-003 |

**Verified APIs:**
- `McpServer` constructor: Confirmed — `new McpServer({ name, version })`
- `server.tool()`: Confirmed — `server.tool(name, schema, handler)` (v1 API)
- `server.registerTool()`: Confirmed — `server.registerTool(name, config, handler)` (v2 API)
- `StdioServerTransport`: Confirmed for stdio transport
- `CallToolResult`: Confirmed — `{ content: [{ type: 'text', text }], isError? }`
- Zod schema integration: Confirmed — tool inputs validated via Zod schemas with `.describe()`

**Key Patterns:**
- Tool registration with Zod schema: `server.tool('name', { param: z.string() }, async handler)`
- v2 migration path: `server.registerTool('name', { inputSchema: z.object({...}) }, handler)`

**Note:** Using v1 `server.tool()` API for v0.1.0. Migration to v2 `registerTool()` documented as future path.

### zod

| Field | Value |
|-------|-------|
| Version | ^3.24.x |
| Context7 ID | /colinhacks/zod |
| Verification Date | 2026-02-11 |
| API Confirmed | Yes |
| Constraint | TC-004 |

**Verified APIs:**
- `z.object()`: Confirmed — schema definition
- `z.string()`: Confirmed — string validation
- `z.number()`: Confirmed — number validation
- `z.boolean()`: Confirmed — boolean validation
- `z.enum()`: Confirmed — enum validation
- `.describe()`: Confirmed — adds description for AI discoverability
- `.optional()`: Confirmed — optional fields
- `.default()`: Confirmed — default values
- `.parse()` / `.safeParse()`: Confirmed — validation execution

**Key Patterns:**
- Tool schema definition: `z.object({ table: z.string().describe('ServiceNow table name') })`
- Config validation: `configSchema.parse(rawConfig)` with error messages

### pino

| Field | Value |
|-------|-------|
| Version | ^9.x |
| Context7 ID | /pinojs/pino |
| Verification Date | 2026-02-11 |
| API Confirmed | Yes |

**Verified APIs:**
- `pino()` constructor: Confirmed — logger creation
- `pino.destination()`: Confirmed — custom destinations (stderr)
- `pino.multistream()`: Confirmed — multiple output streams
- `logger.child()`: Confirmed — child loggers with bindings (correlation IDs)
- `logger.info/warn/error()`: Confirmed — log level methods
- `logger.setBindings()`: Confirmed — dynamic binding updates
- `logger.bindings()`: Confirmed — retrieve current bindings
- `logger.flush()`: Confirmed — explicit flush

**Key Patterns:**
- stderr destination: `pino({ level: 'info' }, pino.destination({ dest: 2 }))`
- Child logger with correlation ID: `logger.child({ correlationId: uuid(), table, method })`

---

## Dev Dependencies

### vitest

| Field | Value |
|-------|-------|
| Version | ^3.x |
| Purpose | Test runner and assertion library |
| Rationale | Fast, ESM-native, TypeScript-first, compatible with Node 20+ |

### @types/node

| Field | Value |
|-------|-------|
| Version | ^20.x |
| Purpose | TypeScript type definitions for Node.js |

### tsx

| Field | Value |
|-------|-------|
| Version | ^4.x |
| Purpose | TypeScript execution for development (ts-node alternative, ESM-compatible) |

---

## Build vs. Integrate Decisions

| Requirement | Custom Build | Library Option | Decision | Rationale |
|-------------|-------------|----------------|----------|-----------|
| MCP Protocol | N/A | `@modelcontextprotocol/sdk` | **Integrate** | Official SDK; only option for TypeScript MCP servers |
| Schema Validation | Custom validators | `zod` | **Integrate** | Required by MCP SDK; mature, zero-config |
| HTTP Client | Custom fetch wrapper | `axios` / `node-fetch` | **Custom** (native fetch) | Node 20+ has built-in fetch; zero dependencies |
| Logging | Custom logger | `pino` / `winston` | **Integrate** (pino) | Fastest JSON logger; native stderr support |
| Auth (Basic) | ~2h custom | N/A | **Custom** | Trivial: base64 encode + header |
| Auth (OAuth) | ~8h custom | `simple-oauth2` | **Custom** | ServiceNow OAuth is simple Client Credentials; library is overkill |
| Rate Limiting | ~4h custom | `bottleneck` | **Custom** | Token bucket is simple; avoids dependency for ~50 LOC |
| Retry Logic | ~3h custom | `p-retry` | **Custom** | Exponential backoff with jitter is straightforward |
| Circuit Breaker | ~4h custom | `opossum` | **Custom** | Simple state machine; avoids heavy dependency |
| Test Runner | N/A | `vitest` | **Integrate** | ESM-native, fast, TypeScript-first |

**Total Integration Savings:** ~40 hours saved via MCP SDK + Zod + Pino vs. building from scratch.

**Custom Build Rationale:** HTTP client, auth, and resilience are kept custom because:
1. Dependencies are minimal (native fetch, simple OAuth flow, basic algorithms)
2. Reduces supply chain risk for a security-focused project
3. Each implementation is <100 LOC
4. Full control over ServiceNow-specific behavior

---

## Verification Checklist

| Technology | Context7 Verified | Version | APIs Confirmed |
|------------|-------------------|---------|----------------|
| @modelcontextprotocol/sdk | Yes | ^1.12.x | Yes |
| zod | Yes | ^3.24.x | Yes |
| pino | Yes | ^9.x | Yes |
| Node.js | N/A (runtime) | >=20 | N/A |
| TypeScript | N/A (compiler) | ^5.x | N/A |
| vitest | N/A (dev tool) | ^3.x | N/A |

---

## Dependency Risk Assessment

| Dependency | Risk Level | Mitigation |
|------------|-----------|------------|
| `@modelcontextprotocol/sdk` | Medium | Pin minor version; monitor changelog |
| `zod` | Low | Mature, stable API; pin minor |
| `pino` | Low | Mature, active maintenance |
| Node.js >=20 | Low | Current LTS; widely supported |
| Native `fetch` | Low | Part of Node.js core since v18 |
