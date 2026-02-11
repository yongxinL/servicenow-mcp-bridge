# Monitoring Plan

## Meta

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Phase | 2 |
| Created | 2026-02-11 |

---

## Overview

The ServiceNow MCP Bridge is a local process (stdio transport) or lightweight HTTP server. Monitoring focuses on structured logging, health indicators, and operational metrics rather than traditional APM infrastructure.

---

## Key Performance Indicators (KPIs)

| KPI | Metric | Target | Threshold | Source |
|-----|--------|--------|-----------|--------|
| Server Startup Time | Time from process launch to MCP ready | <3s | <5s | Startup log entry |
| Tool Call Latency | P95 server-side processing time | <100ms | <500ms | Request log entries |
| ServiceNow API Latency | P95 end-to-end API round-trip | <2s | <5s | Request log entries |
| Error Rate | % of tool calls returning isError:true | <5% | <15% | Error log entries |
| Rate Limit Hits | Requests delayed by rate limiter | <1% of requests | <5% | Rate limiter logs |
| Circuit Breaker Opens | Circuit breaker state transitions to OPEN | 0 per day (normal) | Alert on any | Circuit breaker logs |
| Auth Token Refresh | OAuth token refresh failures | 0 | Alert on any | Auth logs |

---

## Logging-Based Monitoring

Since this is a local CLI tool (not a cloud service), monitoring is log-based via Pino structured JSON to stderr.

### Log Schema

Every ServiceNow API call produces a structured log entry:

```json
{
  "level": 30,
  "time": 1707600000000,
  "msg": "ServiceNow API call",
  "correlationId": "req-abc-123",
  "method": "GET",
  "table": "incident",
  "url": "https://instance.service-now.com/api/now/table/incident",
  "statusCode": 200,
  "durationMs": 245,
  "recordCount": 10
}
```

### Error Log Schema

```json
{
  "level": 50,
  "time": 1707600000000,
  "msg": "ServiceNow API error",
  "correlationId": "req-abc-123",
  "errorCode": "AUTHORIZATION_ERROR",
  "statusCode": 403,
  "table": "incident",
  "durationMs": 120
}
```

### Key Log Events

| Event | Level | Trigger |
|-------|-------|---------|
| Server started | info | MCP server ready |
| Tool called | info | Any MCP tool invocation |
| API request | debug | ServiceNow HTTP request sent |
| API response | info | ServiceNow HTTP response received |
| API error | error | ServiceNow HTTP error (4xx, 5xx) |
| Network error | error | Connection refused, timeout, DNS failure |
| Rate limited | warn | Request delayed by rate limiter |
| Circuit opened | warn | Circuit breaker transitioned to OPEN |
| Auth token refreshed | debug | OAuth token refresh successful |
| Auth token refresh failed | error | OAuth token refresh failed |
| Config loaded | info | Configuration parsed and validated |
| Config error | fatal | Configuration validation failed |

---

## Health Indicators

For HTTP transport mode, a health endpoint can be added:

```
GET /health → { status: "ok", uptime: 12345, modules: ["knowledge", "incident"] }
```

For stdio mode, health is implicit — if the process is running and responding to MCP messages, it's healthy.

---

## Alerting Strategy (Future)

For production deployments using HTTP transport:

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | >15% error rate over 5 minutes | Critical |
| Circuit Breaker Open | Any circuit breaker opens | Warning |
| Auth Failure | OAuth refresh fails 3 consecutive times | Critical |
| Slow Responses | P95 latency >5s for 10 minutes | Warning |

---

## Performance Baselines

To be established during Phase 4 (Verification):

| Metric | Baseline | Measurement Method |
|--------|----------|-------------------|
| Startup time | TBD | Automated test timing |
| Tool call overhead | TBD | Benchmark with mock ServiceNow |
| Memory usage (idle) | TBD | Process memory snapshot |
| Memory usage (under load) | TBD | Load test with 100 sequential calls |
