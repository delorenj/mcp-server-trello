# Trello MCP Health Monitoring System 🏥

## Overview

The Trello MCP server now includes a comprehensive health monitoring system that provides real-time diagnostics and performance analysis. Think of it as having a team of world-class physicians constantly monitoring your API's cardiovascular health! 

## Available Health Endpoints

### 1. Basic Health Check - `get_health`
**Quick pulse check for monitoring systems**

```json
{
  "status": "healthy|degraded|critical",
  "timestamp": "2025-09-01T03:13:26Z", 
  "uptime_ms": 3600000,
  "checks_passed": 4,
  "total_checks": 4,
  "response_time_ms": 156,
  "success_rate": "98.5%"
}
```

Perfect for:
- Load balancer health checks
- Monitoring dashboard integration  
- Quick operational status verification

### 2. Detailed Health Diagnostic - `get_health_detailed`
**Comprehensive medical examination**

Includes:
- ✅ Trello API connectivity verification
- 🏗️ Board access validation
- ⚡ Rate limiter health analysis  
- 📊 Performance metrics assessment
- 📋 List operations testing (detailed mode)
- 🎴 Card operations verification (detailed mode)
- ☑️ Checklist functionality testing (detailed mode)
- 🏢 Workspace access validation (detailed mode)

Returns complete `SystemHealthReport` with:
- Individual check results with timing
- Overall system status determination
- Automated repair recommendations
- Performance metrics analysis

### 3. Metadata Consistency Check - `get_health_metadata`
**Data integrity scanner**

Verifies consistency between:
- Board configuration and accessibility
- List structure and organization
- Card distribution and assignments
- Checklist availability and completeness
- Workspace settings alignment

### 4. Performance Analysis - `get_health_performance`
**Cardiovascular stress test**

Provides detailed metrics:
- Response time analysis with grading (A+ to F)
- Success rate monitoring
- Throughput measurement (requests per minute)
- Rate limit utilization tracking
- Performance trend analysis

### 5. Automated System Repair - `perform_system_repair`
**Digital emergency room**

Attempts to automatically fix:
- Missing active board configuration
- Workspace inconsistencies
- Basic connectivity issues

## Health Status Levels

- **🟢 HEALTHY**: All systems operating optimally
- **🟡 DEGRADED**: Minor issues detected, functionality maintained  
- **🔴 CRITICAL**: Serious issues requiring immediate attention
- **⚪ UNKNOWN**: Unable to determine status

## Performance Grading System

The health monitor assigns letter grades (A+ to F) based on:

- **Response Time (40% weight)**:
  - A+/A: < 200ms (excellent)
  - B: 200-500ms (good)  
  - C: 500-1000ms (fair)
  - D: 1000-2000ms (slow)
  - F: > 2000ms (very slow)

- **Success Rate (35% weight)**:
  - A+: ≥ 99% success rate
  - A: ≥ 95% success rate
  - B: ≥ 90% success rate  
  - C: ≥ 80% success rate
  - D/F: < 80% success rate

- **Rate Limit Utilization (25% weight)**:
  - A+/A: < 50% utilization (optimal)
  - B: 50-70% utilization (moderate)
  - C: 70-85% utilization (high)
  - D: 85-95% utilization (near limit)
  - F: > 95% utilization (critical)

## Usage Examples

### Basic Health Check
```typescript
// Check basic system status
const health = await mcpClient.callTool('get_health');
console.log('System status:', health.status);
```

### Detailed Diagnostic
```typescript
// Get comprehensive health report
const detailedHealth = await mcpClient.callTool('get_health_detailed');
console.log('Recommendations:', detailedHealth.recommendations);
console.log('Performance grade:', detailedHealth.performance_metrics);
```

### Metadata Verification
```typescript
// Check data consistency
const metadataHealth = await mcpClient.callTool('get_health_metadata');
if (!metadataHealth.metadata_consistency.consistent) {
  console.log('Issues found:', metadataHealth.metadata_consistency.issues);
}
```

### Performance Analysis
```typescript
// Analyze system performance
const performance = await mcpClient.callTool('get_health_performance');
console.log('Grade:', performance.performance_grade);
console.log('Response time rating:', performance.analysis.response_time_rating);
```

### Automated Repair
```typescript
// Attempt system repair
const repair = await mcpClient.callTool('perform_system_repair');
if (repair.success) {
  console.log('Repairs completed:', repair.actions_taken);
}
```

## Monitoring Integration

### Prometheus Metrics
The health endpoints return structured data perfect for Prometheus scraping:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'trello-mcp-health'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/health'
    scrape_interval: 30s
```

### Grafana Dashboard
Create visualizations using the performance metrics:
- Response time trends
- Success rate monitoring  
- Rate limit utilization
- Health check status over time

### Alerting Rules
Set up alerts based on health status:
- Critical status: Immediate notification
- Degraded status: Warning notification
- Performance grade below B: Performance alert

## Background Monitoring

The health monitor automatically:
- 🔄 Tracks performance metrics for all API calls
- 📊 Calculates rolling averages and success rates
- 🧹 Cleans up old metrics to prevent memory leaks
- 💾 Maintains request history for analysis
- ⏰ Provides uptime tracking from service start

## Architecture

```
TrelloHealthMonitor
├── Performance Tracking
│   ├── Request duration measurement
│   ├── Success rate calculation
│   └── Rate limit utilization monitoring
├── Health Checks
│   ├── API connectivity verification
│   ├── Board access validation
│   ├── Rate limiter status
│   └── Subsystem testing (detailed mode)
└── Automated Analysis
    ├── Status determination
    ├── Recommendation generation
    └── Repair opportunity detection
```

## Error Handling

All health endpoints include robust error handling:
- Graceful degradation during API issues
- Detailed error reporting with context
- Fallback to cached results when possible
- Safe failure modes that don't impact main functionality

## Security Considerations

- Health endpoints don't expose sensitive credentials
- API key and token information is redacted from responses
- Rate limiting protects against health check abuse
- Error messages are sanitized to prevent information leakage

## Best Practices

1. **Regular Monitoring**: Check basic health every 30-60 seconds
2. **Detailed Diagnostics**: Run comprehensive checks every 5-10 minutes  
3. **Performance Tracking**: Monitor trends over time, not just snapshots
4. **Alert Thresholds**: Set appropriate thresholds for your use case
5. **Repair Usage**: Use automated repair sparingly for non-critical issues

## Troubleshooting Guide

### Common Issues and Solutions

**Status: DEGRADED - "No active board configured"**
- Solution: Use `set_active_board` tool with a valid board ID
- Prevention: Always configure a default board in environment variables

**Status: CRITICAL - "Trello API connectivity failed"**  
- Check: Network connectivity to api.trello.com
- Verify: API key and token are valid and not expired
- Consider: Rate limiting or temporary API outages

**Performance Grade: D or F**
- Investigate: Network latency and bandwidth
- Check: Trello API status page for service issues  
- Optimize: Reduce request frequency or implement caching

**High Rate Limit Utilization**
- Implement: Request batching where possible
- Add: Caching layer for frequently accessed data
- Consider: Distributing load across multiple API keys/tokens

## API Reference

All health endpoints return consistent response formats:

```typescript
interface HealthResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
```

The `text` field contains JSON-formatted health data specific to each endpoint.

## Future Enhancements

Planned improvements include:
- Historical trend analysis
- Predictive failure detection  
- Integration with external monitoring systems
- Custom health check definitions
- Advanced repair capabilities
- Performance optimization recommendations

---

*The health monitoring system: Because your API deserves world-class medical care!* 🩺✨