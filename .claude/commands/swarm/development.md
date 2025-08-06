# Development Swarm Strategy

## Purpose
Coordinated development through specialized agent teams.

## Activation

### Option 1: Using MCP Tools (Preferred in Claude Code)
```javascript
mcp__claude-flow__swarm_init {
  topology: "hierarchical",
  strategy: "development",
  maxAgents: 8
}

mcp__claude-flow__task_orchestrate {
  task: "build feature X",
  strategy: "parallel"
}
```

### Option 2: Using NPX CLI (Fallback when MCP not available)
```bash
# Use when running from terminal or MCP tools unavailable
npx claude-flow swarm "build feature X" --strategy development

# For alpha features
npx claude-flow@alpha swarm "build feature X" --strategy development
```

### Option 3: Local Installation
```bash
# If claude-flow is installed locally
./claude-flow swarm "build feature X" --strategy development
```

## Agent Roles
- Architect: Designs system structure
- Frontend Developer: Implements UI
- Backend Developer: Creates APIs
- Database Specialist: Manages data layer
- Integration Expert: Connects components

## Best Practices
- Use hierarchical mode for large projects
- Enable parallel execution
- Implement continuous testing
