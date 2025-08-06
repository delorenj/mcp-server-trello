# Research Swarm Strategy

## Purpose
Deep research through parallel information gathering.

## Activation

### Option 1: Using MCP Tools (Preferred in Claude Code)
```javascript
mcp__claude-flow__swarm_init {
  topology: "distributed",
  strategy: "research",
  maxAgents: 6
}

mcp__claude-flow__task_orchestrate {
  task: "research topic X",
  strategy: "parallel"
}
```

### Option 2: Using NPX CLI (Fallback when MCP not available)
```bash
# Use when running from terminal or MCP tools unavailable
npx claude-flow swarm "research topic X" --strategy research

# For alpha features
npx claude-flow@alpha swarm "research topic X" --strategy research
```

### Option 3: Local Installation
```bash
# If claude-flow is installed locally
./claude-flow swarm "research topic X" --strategy research
```

## Agent Roles
- Web Researcher: Searches online sources
- Academic Researcher: Analyzes papers
- Data Analyst: Processes findings
- Report Writer: Synthesizes results

## Research Methods
- Parallel web searches
- Cross-reference validation
- Source credibility assessment
