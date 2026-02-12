# ServiceNow MCP Bridge

**A highly customizable Model Context Protocol (MCP) server for secure ServiceNow API integration.**

servicenow-mcp-bridge enables AI assistants and modern development tools to interact with ServiceNow instances through a standardized MCP interface. It acts as a governed translation layer between MCP clients and the ServiceNow REST API, providing structured access to enterprise workflows and data.

---

## 🚀 Overview

`servicenow-mcp-bridge` connects ServiceNow with AI agents, automation frameworks, and development environments using the Model Context Protocol (MCP).

It abstracts ServiceNow API complexity, enforces authentication and configuration controls, and exposes ServiceNow capabilities as MCP-compatible tools.

Designed for enterprise environments, it supports modular enablement, environment-based configuration, and production-grade resilience patterns.

---

## ✨ Features

### 🔹 Comprehensive ServiceNow API Coverage

Supports core ServiceNow platform domains including:

* Incident Management
* Change Management
* Problem Management
* Configuration Management Database (CMDB)
* Service Catalog
* Knowledge Base
* User Management
* Custom Table Operations

Easily extendable to additional ServiceNow modules.

---

### 🔹 Highly Customizable

* Feature flags to enable or disable specific modules
* Environment-based configuration (DEV / UAT / PRD)
* JSON configuration files with override support
* Flexible authentication strategies

  * Basic Auth
  * OAuth 2.0
  * API Tokens (if supported by instance)

---

### 🔹 Production Ready

Built with enterprise reliability patterns:

* Full async/await support for high performance
* Retry logic with exponential backoff
* Comprehensive error handling
* Structured JSON logging
* ServiceNow API rate-limit handling
* Configurable timeouts and circuit control (optional extension)

---

## 📋 Prerequisites

* **Node.js**: >= 20.0.0
* **ServiceNow Instance**: Access to a ServiceNow instance (dev, test, or production)
* **ServiceNow Credentials**: Basic Auth (username/password), OAuth, or API Token
* **MCP Client**: Claude Desktop, Cline, or any MCP-compatible client

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd servicenow-mcp-bridge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

---

## ⚙️ Configuration

The server uses a 3-tier configuration system:

1. **Defaults** (built-in safe defaults)
2. **Config File** (optional `config.json`)
3. **Environment Variables** (highest precedence)

### Environment Variables (Required)

Create a `.env` file or set environment variables:

#### Basic Authentication

```bash
# ServiceNow instance (without https://)
SERVICENOW_INSTANCE=dev12345.service-now.com

# Authentication
SERVICENOW_AUTH_TYPE=basic
SERVICENOW_USERNAME=admin
SERVICENOW_PASSWORD=your-password
```

#### OAuth 2.0 Authentication

```bash
SERVICENOW_INSTANCE=dev12345.service-now.com

SERVICENOW_AUTH_TYPE=oauth
SERVICENOW_CLIENT_ID=your-client-id
SERVICENOW_CLIENT_SECRET=your-client-secret
SERVICENOW_TOKEN_URL=https://dev12345.service-now.com/oauth_token.do
```

#### Token Authentication

```bash
SERVICENOW_INSTANCE=dev12345.service-now.com

SERVICENOW_AUTH_TYPE=token
SERVICENOW_TOKEN=your-api-token
```

### Optional Configuration File

Create `config.json` in the project root to customize module settings:

```json
{
  "modules": {
    "generic": {
      "enabled": true,
      "allow_write": false
    },
    "knowledge": {
      "enabled": true,
      "allow_write": false
    },
    "incident": {
      "enabled": true,
      "allow_write": true
    }
  },
  "logging": {
    "level": "info"
  }
}
```

**Note**: All modules are enabled by default in read-only mode. Set `allow_write: true` only for modules that should support create/update/delete operations.

---

## 🖥️ Running the Server

### Standalone Mode (for testing)

```bash
# Build and run
npm run build
npm start
```

The server will start and listen for MCP protocol messages on stdin/stdout. Logs are written to stderr.

---

## 🔌 Configuring with Claude Desktop

### 1. Locate Claude Desktop Config

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. Add MCP Server Configuration

Edit the config file and add the `servicenow-mcp-bridge` server:

```json
{
  "mcpServers": {
    "servicenow": {
      "command": "node",
      "args": [
        "/absolute/path/to/servicenow-mcp-bridge/dist/index.js"
      ],
      "env": {
        "SERVICENOW_INSTANCE": "dev12345.service-now.com",
        "SERVICENOW_AUTH_TYPE": "basic",
        "SERVICENOW_USERNAME": "admin",
        "SERVICENOW_PASSWORD": "your-password"
      }
    }
  }
}
```

**Important**:
- Use the **absolute path** to the `dist/index.js` file
- Include all required environment variables in the `env` section
- Replace `dev12345.service-now.com` with your actual ServiceNow instance

### 3. Restart Claude Desktop

After saving the configuration, completely restart Claude Desktop to load the MCP server.

---

## 🧪 Testing the Connection

### Using Claude Desktop

1. Open Claude Desktop
2. Start a new conversation
3. Look for the 🔌 icon indicating MCP servers are connected
4. Try a test query:

```
Can you list the available ServiceNow tools?
```

Or test a specific operation:

```
Search for knowledge articles about "password reset"
```

```
List the 5 most recent incidents
```

### Verify Available Tools

The following MCP tools should be available (M2 implementation):

#### Generic Module (always available)
- `query_records` - Query any ServiceNow table
- `get_record` - Get a single record by sys_id
- `create_record` - Create records (if allow_write enabled)
- `update_record` - Update records (if allow_write enabled)
- `delete_record` - Delete records (if allow_write enabled)

#### Knowledge Base Module
- `search_knowledge` - Search knowledge articles
- `get_article` - Get article by sys_id
- `create_article` - Create articles (if allow_write enabled)
- `update_article` - Update articles (if allow_write enabled)

#### Incident Module
- `list_incidents` - List incidents with semantic filtering
- `get_incident` - Get incident by sys_id or number
- `create_incident` - Create incidents (if allow_write enabled)
- `update_incident` - Update incidents (if allow_write enabled)
- `resolve_incident` - Resolve incidents (if allow_write enabled)
- `add_incident_comment` - Add comments/work notes (if allow_write enabled)

---

## 🛡️ Security Best Practices

* **Never commit credentials** to version control
* **Use read-only mode** (`allow_write: false`) by default
* **Enable write operations** only for specific modules that require it
* **Use dedicated ServiceNow accounts** with minimal required permissions
* **Consider OAuth 2.0** for production deployments over Basic Auth
* **Review ServiceNow ACLs** to ensure proper access control
* **Monitor API usage** to stay within rate limits

---

## 🐛 Troubleshooting

### Server Won't Start

Check logs in stderr for specific error messages:

```bash
npm start 2> server.log
```

Common issues:
- **Missing environment variables**: Ensure all required variables are set
- **Invalid credentials**: Verify ServiceNow username/password or token
- **Network connectivity**: Ensure you can reach the ServiceNow instance
- **Node version**: Verify Node.js >= 20.0.0

### Tools Not Appearing in Claude Desktop

1. Verify the MCP server is configured correctly in `claude_desktop_config.json`
2. Ensure you're using **absolute paths** (not relative paths like `./dist/index.js`)
3. Check that the build directory exists: `ls /path/to/servicenow-mcp-bridge/dist/index.js`
4. Restart Claude Desktop completely (not just the window)
5. Check Claude Desktop logs for connection errors

### Authentication Failures

- **Basic Auth**: Verify username and password are correct
- **OAuth**: Ensure client ID, secret, and token URL are valid
- **Token**: Verify the API token hasn't expired
- **Instance URL**: Use the domain only (e.g., `dev12345.service-now.com`), not the full URL

---

## 📚 Example Usage

### Semantic Incident Search

```
List all high priority incidents assigned to the network team
```

The AI assistant will use the `list_incidents` tool with semantic parameters:
```json
{
  "priority": "high",
  "assignment_group": "network"
}
```

### Knowledge Base Search

```
Find knowledge articles about VPN connectivity issues
```

Uses `search_knowledge` with natural language query.

### Create Incident (if write enabled)

```
Create a new incident: "Email server is down" with high priority
```

Uses `create_incident` with semantic priority mapping.

---

## 📖 Documentation

For detailed architecture, development, and testing information, see:

* `docs/architecture/` - System design, task breakdown, API contracts
* `docs/knowledge-base/` - Development patterns and lessons learned
* `docs/implementation/` - Implementation checkpoints and progress tracking

---

## 🤝 Contributing

This project uses the CodeMaestro framework for structured development. See `.CodeMaestro/` for development guidelines.

---

## 📄 License

Apache License 2.0 - See [LICENSE](LICENSE) for details.

---

## 🚧 Development Status

**Current Phase**: Phase 3 (Implementation) - M2 Complete

- ✅ M1: Foundation (Auth, Client, Resilience, Logging, Registry)
- ✅ M2: Priority Modules (Generic, Knowledge Base, Incident)
- 🚧 M3: Core Modules (Change, Problem, CMDB, Catalog, User)
- ⏳ M4: Testing & Quality (Unit tests, Integration tests, Documentation)

**Progress**: 14/25 tasks complete (56%)
