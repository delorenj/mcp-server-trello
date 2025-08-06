# Maintenance Swarm Strategy

## Purpose
System maintenance and updates through coordinated agents.

## Activation

### Option 1: Using MCP Tools (Preferred in Claude Code)
```javascript
mcp__claude-flow__swarm_init {
  topology: "hierarchical",
  strategy: "maintenance",
  maxAgents: 5
}

mcp__claude-flow__task_orchestrate {
  task: "update dependencies",
  strategy: "sequential",
  priority: "high"
}
```

### Option 2: Using NPX CLI (Fallback when MCP not available)
```bash
# Use when running from terminal or MCP tools unavailable
npx claude-flow swarm "update dependencies" --strategy maintenance

# For alpha features
npx claude-flow@alpha swarm "update dependencies" --strategy maintenance
```

### Option 3: Local Installation
```bash
# If claude-flow is installed locally
./claude-flow swarm "update dependencies" --strategy maintenance
```

## Agent Roles
- Dependency Analyzer: Checks for updates
- Security Scanner: Identifies vulnerabilities
- Test Runner: Validates changes
- Documentation Updater: Maintains docs

## Safety Features
- Automatic backups
- Rollback capability
- Incremental updates
