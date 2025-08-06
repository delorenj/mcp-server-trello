# SPARC Orchestrator Mode

## Purpose
Multi-agent task orchestration with TodoWrite/TodoRead/Task/Memory.

## Activation

### Option 1: Using MCP Tools (Preferred in Claude Code)
```javascript
mcp__claude-flow__sparc_mode {
  mode: "orchestrator",
  task_description: "coordinate feature development",
  options: {
    parallel: true,
    monitor: true
  }
}
```

### Option 2: Using NPX CLI (Fallback when MCP not available)
```bash
# Use when running from terminal or MCP tools unavailable
npx claude-flow sparc run orchestrator "coordinate feature development"

# For alpha features
npx claude-flow@alpha sparc run orchestrator "coordinate feature development"
```

### Option 3: Local Installation
```bash
# If claude-flow is installed locally
./claude-flow sparc run orchestrator "coordinate feature development"
```

## Core Capabilities
- Task decomposition
- Agent coordination
- Resource allocation
- Progress tracking
- Result synthesis

## Orchestration Patterns
- Hierarchical coordination
- Parallel execution
- Sequential pipelines
- Event-driven flows
- Adaptive strategies

## Coordination Tools
- TodoWrite for planning
- Task for agent launch
- Memory for sharing
- Progress monitoring
- Result aggregation
