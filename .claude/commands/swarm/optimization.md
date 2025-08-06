# Optimization Swarm Strategy

## Purpose
Performance optimization through specialized analysis.

## Activation

### Option 1: Using MCP Tools (Preferred in Claude Code)
```javascript
mcp__claude-flow__swarm_init {
  topology: "mesh",
  strategy: "optimization",
  maxAgents: 6
}

mcp__claude-flow__task_orchestrate {
  task: "optimize performance",
  strategy: "parallel"
}
```

### Option 2: Using NPX CLI (Fallback when MCP not available)
```bash
# Use when running from terminal or MCP tools unavailable
npx claude-flow swarm "optimize performance" --strategy optimization

# For alpha features
npx claude-flow@alpha swarm "optimize performance" --strategy optimization
```

### Option 3: Local Installation
```bash
# If claude-flow is installed locally
./claude-flow swarm "optimize performance" --strategy optimization
```

## Agent Roles
- Performance Profiler: Identifies bottlenecks
- Memory Analyzer: Detects leaks
- Code Optimizer: Implements improvements
- Benchmark Runner: Measures impact

## Optimization Areas
- Execution speed
- Memory usage
- Network efficiency
- Bundle size
