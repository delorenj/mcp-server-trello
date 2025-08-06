# Testing Swarm Strategy

## Purpose
Comprehensive testing through distributed execution.

## Activation

### Option 1: Using MCP Tools (Preferred in Claude Code)
```javascript
mcp__claude-flow__swarm_init {
  topology: "distributed",
  strategy: "testing",
  maxAgents: 5
}

mcp__claude-flow__task_orchestrate {
  task: "test application",
  strategy: "parallel"
}
```

### Option 2: Using NPX CLI (Fallback when MCP not available)
```bash
# Use when running from terminal or MCP tools unavailable
npx claude-flow swarm "test application" --strategy testing

# For alpha features
npx claude-flow@alpha swarm "test application" --strategy testing
```

### Option 3: Local Installation
```bash
# If claude-flow is installed locally
./claude-flow swarm "test application" --strategy testing
```

## Agent Roles
- Unit Tester: Tests individual components
- Integration Tester: Validates interactions
- E2E Tester: Tests user flows
- Performance Tester: Measures metrics
- Security Tester: Finds vulnerabilities

## Test Coverage
- Code coverage analysis
- Edge case identification
- Regression prevention
