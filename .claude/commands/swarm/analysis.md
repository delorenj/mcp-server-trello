# Analysis Swarm Strategy

## Purpose
Comprehensive analysis through distributed agent coordination.

## Activation

### Option 1: Using MCP Tools (Preferred in Claude Code)
```javascript
mcp__claude-flow__swarm_init {
  topology: "mesh",
  strategy: "analysis",
  maxAgents: 6
}

mcp__claude-flow__task_orchestrate {
  task: "analyze system performance",
  strategy: "distributed"
}
```

### Option 2: Using NPX CLI (Fallback when MCP not available)
```bash
# Use when running from terminal or MCP tools unavailable
npx claude-flow swarm "analyze system performance" --strategy analysis

# For alpha features
npx claude-flow@alpha swarm "analyze system performance" --strategy analysis
```

### Option 3: Local Installation
```bash
# If claude-flow is installed locally
./claude-flow swarm "analyze system performance" --strategy analysis
```

## Agent Roles
- Data Collector: Gathers metrics and logs
- Pattern Analyzer: Identifies trends and anomalies
- Report Generator: Creates comprehensive reports
- Insight Synthesizer: Combines findings

## Coordination Modes
- Mesh: For exploratory analysis
- Pipeline: For sequential processing
- Hierarchical: For complex systems
