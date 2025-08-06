---
name: claude-flow-memory
description: Interact with Claude-Flow memory system using batchtools optimization
---

# 🧠 Claude-Flow Memory System (Batchtools Optimized)

The memory system provides persistent storage for cross-session and cross-agent collaboration with CRDT-based conflict resolution.

**🚀 Batchtools Enhancement**: Enhanced with parallel processing capabilities, batch operations, and concurrent optimization for improved performance.

## Store Information (Enhanced)

### Standard Storage
```bash
# Store with default namespace
./claude-flow memory store "key" "value"

# Store with specific namespace
./claude-flow memory store "architecture_decisions" "microservices with API gateway" --namespace arch
```

### Batch Storage (Optimized)
```bash
# Store multiple entries in parallel
./claude-flow memory batch-store entries.json --parallel

# Store with concurrent validation
./claude-flow memory concurrent-store "multiple_keys" "values" --namespace arch --validate

# Bulk storage with optimization
./claude-flow memory bulk-store project-data/ --recursive --optimize --parallel
```

## Query Memory (Enhanced)

### Standard Queries
```bash
# Search across all namespaces
./claude-flow memory query "authentication"

# Search with filters
./claude-flow memory query "API design" --namespace arch --limit 10
```

### Parallel Queries (Optimized)
```bash
# Execute multiple queries concurrently
./claude-flow memory parallel-query "auth,api,database" --concurrent

# Search across multiple namespaces simultaneously
./claude-flow memory concurrent-search "authentication" --namespaces arch,impl,test --parallel

# Batch query processing
./claude-flow memory batch-query queries.json --optimize --results-parallel
```

## Memory Statistics (Enhanced)

### Standard Statistics
```bash
# Show overall statistics
./claude-flow memory stats

# Show namespace-specific stats
./claude-flow memory stats --namespace project
```

### Performance Statistics (Optimized)
```bash
# Real-time performance monitoring
./claude-flow memory stats --real-time --performance

# Concurrent analysis across all namespaces
./claude-flow memory concurrent-stats --all-namespaces --detailed

# Batch performance analysis
./claude-flow memory performance-stats --optimization --benchmarks
```

## Export/Import (Enhanced)

### Standard Operations
```bash
# Export all memory
./claude-flow memory export full-backup.json

# Export specific namespace
./claude-flow memory export project-backup.json --namespace project

# Import memory
./claude-flow memory import backup.json
```

### Batch Operations (Optimized)
```bash
# Export multiple namespaces in parallel
./claude-flow memory concurrent-export namespaces.json --parallel --compress

# Batch import with validation
./claude-flow memory batch-import backups/ --validate --parallel

# Incremental export with optimization
./claude-flow memory incremental-export --since yesterday --optimize --concurrent
```

## Cleanup Operations (Enhanced)

### Standard Cleanup
```bash
# Clean entries older than 30 days
./claude-flow memory cleanup --days 30

# Clean specific namespace
./claude-flow memory cleanup --namespace temp --days 7
```

### Batch Cleanup (Optimized)
```bash
# Parallel cleanup across multiple namespaces
./claude-flow memory concurrent-cleanup --namespaces temp,cache --days 7 --parallel

# Smart cleanup with optimization
./claude-flow memory smart-cleanup --auto-optimize --performance-based

# Batch maintenance operations
./claude-flow memory batch-maintenance --compress --reindex --parallel
```

## 🗂️ Namespaces (Enhanced)
- **default** - General storage with parallel access
- **agents** - Agent-specific data with concurrent updates
- **tasks** - Task information with batch processing
- **sessions** - Session history with parallel indexing
- **swarm** - Swarm coordination with distributed memory
- **project** - Project-specific context with concurrent access
- **spec** - Requirements and specifications with parallel validation
- **arch** - Architecture decisions with concurrent analysis
- **impl** - Implementation notes with batch processing
- **test** - Test results with parallel execution
- **debug** - Debug logs with concurrent analysis
- **performance** - Performance metrics with real-time monitoring
- **batchtools** - Batchtools operation data and optimization metrics

## 🎯 Best Practices (Batchtools Enhanced)

### Naming Conventions (Optimized)
- Use descriptive, searchable keys for parallel operations
- Include timestamp for time-sensitive data with concurrent access
- Prefix with component name for batch processing clarity
- Use consistent naming patterns for automated batch operations

### Organization (Enhanced)
- Use namespaces to categorize data for parallel processing
- Store related data together for batch operations
- Keep values concise but complete for efficient concurrent access
- Implement hierarchical organization for smart batching

### Maintenance (Optimized)
- Regular backups with parallel export operations
- Clean old data with concurrent cleanup processes
- Monitor storage statistics with real-time performance tracking
- Compress large values with batch optimization
- Use incremental backups for efficiency

### Performance Optimization
- Use batch operations for multiple related memory operations
- Enable parallel processing for independent queries and storage
- Monitor concurrent operation limits to avoid resource exhaustion
- Implement smart caching for frequently accessed data

## Examples (Batchtools Enhanced)

### Store SPARC context with parallel operations:
```bash
# Batch store multiple SPARC contexts
./claude-flow memory batch-store sparc-contexts.json --namespace sparc --parallel

# Concurrent storage across multiple namespaces
./claude-flow memory concurrent-store spec,arch,impl "project data" --parallel --validate

# Performance-optimized bulk storage
./claude-flow memory bulk-store project-data/ --optimize --concurrent --compress
```

### Query project decisions with concurrent processing:
```bash
# Parallel queries across multiple namespaces
./claude-flow memory parallel-query "authentication" --namespaces arch,impl,test --concurrent

# Batch query processing with optimization
./claude-flow memory batch-query project-queries.json --optimize --results-concurrent

# Real-time search with performance monitoring
./claude-flow memory concurrent-search "API design" --real-time --performance
```

### Backup project memory with parallel processing:
```bash
# Concurrent export with compression
./claude-flow memory concurrent-export project-$(date +%Y%m%d).json --namespace project --compress --parallel

# Batch backup with incremental processing
./claude-flow memory batch-backup --incremental --all-namespaces --optimize

# Performance-optimized full backup
./claude-flow memory parallel-backup --full --compress --validate --concurrent
```

## 📊 Performance Features

### Parallel Processing
- **Concurrent Storage**: Store multiple entries simultaneously
- **Parallel Queries**: Execute multiple searches concurrently
- **Batch Operations**: Group related memory operations
- **Pipeline Processing**: Chain memory operations with parallel stages

### Resource Optimization
- **Smart Caching**: Intelligent caching for frequent operations
- **Memory Management**: Optimized memory usage for large datasets
- **I/O Optimization**: Efficient disk operations with concurrent access
- **Index Optimization**: Parallel indexing for faster searches

### Performance Monitoring
- **Real-time Metrics**: Monitor memory operation performance
- **Resource Usage**: Track memory, CPU, and I/O utilization
- **Operation Analysis**: Analyze memory operation efficiency
- **Optimization Recommendations**: Automatic performance suggestions

## 🔧 Configuration (Batchtools Enhanced)

### Memory Configuration with Batchtools
```json
{
  "memory": {
    "backend": "json",
    "path": "./memory/claude-flow-data.json",
    "cacheSize": 10000,
    "indexing": true,
    "batchtools": {
      "enabled": true,
      "maxConcurrent": 15,
      "batchSize": 50,
      "parallelIndexing": true,
      "concurrentBackups": true,
      "smartCaching": true
    },
    "performance": {
      "enableParallelAccess": true,
      "concurrentQueries": 25,
      "batchWriteSize": 100,
      "parallelIndexUpdate": true,
      "realTimeMonitoring": true
    }
  }
}
```

## 🚨 Troubleshooting (Enhanced)

### Performance Issues
```bash
# Monitor memory operation performance
./claude-flow memory debug --performance --concurrent

# Analyze batch operation efficiency
./claude-flow memory analyze --batchtools --optimization

# Check parallel processing status
./claude-flow memory status --parallel --detailed
```

### Optimization Commands
```bash
# Optimize memory configuration
./claude-flow memory optimize --auto-tune --performance

# Benchmark memory operations
./claude-flow memory benchmark --all-operations --detailed

# Performance report generation
./claude-flow memory performance-report --detailed --recommendations
```

For comprehensive memory system documentation and optimization guides, see: https://github.com/ruvnet/claude-code-flow/docs/memory-batchtools.md
