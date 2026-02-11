# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**servicenow-mcp-bridge** is a Model Context Protocol (MCP) server that provides secure, standardized access to ServiceNow REST APIs. It acts as a governed translation layer between MCP clients (AI assistants, automation tools) and ServiceNow instances.

### Purpose
- Enable AI assistants to interact with ServiceNow through the MCP standard
- Abstract ServiceNow API complexity behind a clean MCP interface
- Provide enterprise-grade authentication, rate limiting, and error handling
- Support modular enablement of ServiceNow modules (Incident, Change, CMDB, etc.)

### Project Status
**Early Development** - This project is newly initialized with documentation structure in place. No source code has been implemented yet. The project is being developed using the CodeMaestro framework (see `.CodeMaestro/` directory).

## Architecture

### Planned Technology Stack
The `.gitignore` suggests support for multiple languages. Expected implementation language will be determined during planning phase, likely:
- **Node.js/TypeScript** for MCP ecosystem compatibility
- **Python** as alternative for enterprise environments
- Standard MCP SDK libraries for the chosen language

### Core Components (Planned)
- **MCP Server Interface**: Implements Model Context Protocol specification
- **ServiceNow API Client**: Handles authentication and API communication
- **Module Handlers**: Domain-specific logic for each ServiceNow module
- **Configuration System**: Environment-based config (DEV/UAT/PRD), feature flags
- **Resilience Layer**: Retry logic, rate limiting, circuit breakers, error handling

### ServiceNow Modules (Planned)
- Incident Management
- Change Management
- Problem Management
- CMDB (Configuration Management Database)
- Service Catalog
- Knowledge Base
- User Management
- Custom Table Operations

## Development Process

This project uses **CodeMaestro** - a structured 5-phase development methodology:

### Phase Structure
1. **Requirements** (Phase 1): Specification, competitive analysis, acceptance criteria
2. **Planning** (Phase 2): Architecture, task breakdown, technical blueprint
3. **Implementation** (Phase 3): Code development, module contexts, decision logging
4. **Verification** (Phase 4): Testing, security scanning, quality gates
5. **Release** (Phase 5): Release coordination, lessons learned, knowledge base updates

### Key Directories
- `.CodeMaestro/` - Framework files (prompts, agents, configs) - excluded from deliverables
- `docs/` - Project documentation organized by phase
  - `specifications/` - Requirements and specifications
  - `architecture/` - System design, task definitions
  - `implementation/` - Decision logs, context packages
  - `verification/` - Test plans, evidence packages
  - `knowledge-base/` - Organizational learning, patterns, failures
- `src/` (not yet created) - Source code will go here
- `tests/` (not yet created) - Test files

## Working with This Project

### Initial Setup
Since no code exists yet, start by understanding the vision from [README.md](README.md).

### When Source Code Exists
Commands for building, testing, and running will be documented here once the implementation language and tooling are finalized during Phase 2 (Planning).

Expected workflow (will be updated):
```bash
# Install dependencies
[To be determined based on chosen language]

# Run tests
[To be determined]

# Build
[To be determined]

# Run MCP server
[To be determined]
```

### Configuration
ServiceNow instances and authentication will be configured via environment variables:
- `SERVICENOW_INSTANCE` - ServiceNow instance URL
- `SERVICENOW_AUTH_TYPE` - Authentication method (basic, oauth, token)
- Authentication credentials (method-specific environment variables)
- Feature flags for enabling/disabling specific modules

### CodeMaestro Framework
The `.CodeMaestro/` directory contains the development framework used to build this project. Key references:
- `.CodeMaestro/prompts/00-core.md` - Core constraints and principles
- `.CodeMaestro/config/CONFIG-QUICK-REFERENCE.md` - Configuration index
- `.CodeMaestro/agents/` - Specialized agents (architect, developer, qa-lead, etc.)

When working on this project, follow the phase-appropriate workflow defined in `.CodeMaestro/prompts/`.

## Key Principles

### Security First
- Never commit credentials or API keys
- Use environment variables for all sensitive configuration
- Validate and sanitize all inputs from MCP clients
- Implement proper authentication and authorization
- Follow ServiceNow security best practices

### Modularity
- Each ServiceNow module should be independently enableable
- Feature flags for granular control
- Clean separation between MCP interface and ServiceNow API logic

### Production Readiness
- Comprehensive error handling with structured logging
- Retry logic with exponential backoff for transient failures
- Rate limiting to respect ServiceNow API limits
- Timeouts for all external calls
- Health checks and monitoring endpoints

### MCP Compliance
- Strictly follow Model Context Protocol specification
- Implement all required MCP server capabilities
- Provide clear tool schemas and descriptions
- Return structured, parseable responses

## Related Documentation

- [README.md](README.md) - Project vision, features, planned capabilities
- [LICENSE](LICENSE) - Project license (Apache 2.0)
- `docs/CHANGELOG.md` - Version history (currently empty)
- `.CodeMaestro/config/anti-hallucination-guide.md` - Development philosophy: copy verified patterns, don't invent

---

**Note:** This CLAUDE.md will be updated as the project evolves through development phases. Current phase: Pre-Phase 1 (Project Initialization).
