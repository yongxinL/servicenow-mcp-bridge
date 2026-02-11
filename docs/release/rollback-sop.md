# Rollback SOP

## Meta

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Phase | 2 |
| Created | 2026-02-11 |

---

## Rollback Strategy

Since servicenow-mcp-bridge is distributed as an npm package (or cloned repository), rollback involves reverting to a known-good Git tag.

---

## Procedures

### 1. Revert to Previous Release Tag

```bash
# List available tags
git tag -l 'v*'

# Checkout the last known-good tag
git checkout v0.1.0  # or whatever the last good version is

# Reinstall dependencies at that version
npm ci
```

### 2. Revert a Specific Commit

```bash
# Identify the problematic commit
git log --oneline -10

# Revert it (creates a new commit)
git revert <commit-hash>

# Rebuild
npm ci && npm run build
```

### 3. Revert to Phase Checkpoint

Each phase is tagged. To roll back to a phase boundary:

```bash
# Phase 2 completion
git checkout v0.2.0-plan

# Phase 3 completion (implementation)
git checkout v0.3.0-impl

# Phase 4 completion (verification)
git checkout v0.4.0-verified
```

### 4. Emergency: Full Reset to Main

```bash
# Only if dev branch is corrupted
git checkout main
git branch -D dev
git checkout -b dev
```

---

## Pre-Rollback Checklist

- [ ] Identify the problematic change (commit hash, PR number)
- [ ] Confirm the rollback target (tag or commit)
- [ ] Ensure no uncommitted work will be lost
- [ ] Notify team if applicable

## Post-Rollback Verification

- [ ] `npm ci` succeeds
- [ ] `npm run build` succeeds (if build step exists)
- [ ] `npx vitest` passes
- [ ] Server starts successfully with test config
- [ ] Core tools (query_records, search_knowledge) respond correctly

---

## Git Branch Strategy

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Stable releases only | Protected; merge via PR |
| `dev` | Active development | Default working branch |
| `feature/*` | Feature branches | Merge to dev via PR |
| `task/T-X.X.X-*` | Individual task branches | Merge to dev |
