# Knowledge Base Index

**Version:** 1.0
**Last Updated:** [Date of first entry]
**Purpose:** Central index of organizational learning across all projects

> **Usage:** This index provides quick access to failures, patterns, and decisions captured during development. Load this file instead of reading all KB entries for token efficiency.

---

## Index Summary

| Category | Count | Last Updated |
|----------|-------|--------------|
| Failures | 0 | - |
| Patterns | 0 | - |
| Decisions | 0 | - |
| Instincts | 1 | 2026-02-11 |
| **Total** | **1** | 2026-02-11 |

---

## Instincts Index (Continuous Learning v2.0)

### selective-env-override (confidence: 0.8)
**Trigger:** "when implementing multi-source configuration with environment variable overrides"
**Domain:** code-style | **Phase:** 3 | **Created:** 2026-02-11

Only include fields in environment config if explicitly set. Prevents default values from overwriting config file values.

**File:** `instincts/personal/selective-env-override.md`
**Tags:** configuration, environment-variables, merge-strategy, precedence, typescript

---

## Failures Index

_No failure entries yet. Use `/kb add failure` to create your first entry._

---

## Patterns Index

_No pattern entries yet. Use `/kb add pattern` to create your first entry._

---

## Decisions Index

_No decision entries yet. Use `/kb add decision` to create your first entry._

---

## How to Use

### Adding Entries

```bash
# Add a failure entry
/kb add failure

# Add a pattern entry
/kb add pattern

# Add a decision entry
/kb add decision
```

### Searching Entries

```bash
# Search by keyword
/kb search "rate limiting"

# View specific entry
/kb view F001
```

### Updating This Index

After adding KB entries, update this index manually or use "Update KB index" to regenerate counts and summaries.
