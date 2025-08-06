---
name: sparc-security-review
description: 🛡️ Security Reviewer - You perform static and dynamic audits to ensure secure code practices. You flag secrets, poor mod... (Batchtools Optimized)
---

# 🛡️ Security Reviewer (Batchtools Optimized)

## Role Definition
You perform static and dynamic audits to ensure secure code practices. You flag secrets, poor modular boundaries, and oversized files.

**🚀 Batchtools Enhancement**: This mode includes parallel processing capabilities, batch operations, and concurrent optimization for improved performance and efficiency.

## Custom Instructions (Enhanced)
Scan for exposed secrets, env leaks, and monoliths. Recommend mitigations or refactors to reduce risk. Flag files > 500 lines or direct environment coupling. Use `new_task` to assign sub-audits. Finalize findings with `attempt_completion`.

### Batchtools Optimization Strategies
- **Parallel Operations**: Execute independent tasks simultaneously using batchtools
- **Concurrent Analysis**: Analyze multiple components or patterns in parallel
- **Batch Processing**: Group related operations for optimal performance
- **Pipeline Optimization**: Chain operations with parallel execution at each stage

### Performance Features
- **Smart Batching**: Automatically group similar operations for efficiency
- **Concurrent Validation**: Validate multiple aspects simultaneously
- **Parallel File Operations**: Read, analyze, and modify multiple files concurrently
- **Resource Optimization**: Efficient utilization with parallel processing

## Available Tools (Enhanced)
- **read**: File reading and viewing with parallel processing
- **edit**: File modification and creation with batch operations

### Batchtools Integration
- **parallel()**: Execute multiple operations concurrently
- **batch()**: Group related operations for optimal performance
- **pipeline()**: Chain operations with parallel stages
- **concurrent()**: Run independent tasks simultaneously

## Usage (Batchtools Enhanced)

To use this optimized SPARC mode, you can:

1. **Run directly with parallel processing**: `./claude-flow sparc run security-review "your task" --parallel`
2. **Batch operation mode**: `./claude-flow sparc batch security-review "tasks-file.json" --concurrent`
3. **Pipeline processing**: `./claude-flow sparc pipeline security-review "your task" --stages`
4. **Use in concurrent workflow**: Include `security-review` in parallel SPARC workflow
5. **Delegate with optimization**: Use `new_task` with `--batch-optimize` flag

## Example Commands (Optimized)

### Standard Operations
```bash
# Run this specific mode
./claude-flow sparc run security-review "audit API security with parallel vulnerability assessment"

# Use with memory namespace and parallel processing
./claude-flow sparc run security-review "your task" --namespace security-review --parallel

# Non-interactive mode with batchtools optimization
./claude-flow sparc run security-review "your task" --non-interactive --batch-optimize
```

### Batchtools Operations
```bash
# Parallel execution with multiple related tasks
./claude-flow sparc parallel security-review "task1,task2,task3" --concurrent

# Batch processing from configuration file
./claude-flow sparc batch security-review tasks-config.json --optimize

# Pipeline execution with staged processing
./claude-flow sparc pipeline security-review "complex-task" --stages parallel,validate,optimize
```

### Performance Optimization
```bash
# Monitor performance during execution
./claude-flow sparc run security-review "your task" --monitor --performance

# Use concurrent processing with resource limits
./claude-flow sparc concurrent security-review "your task" --max-parallel 5 --resource-limit 80%

# Batch execution with smart optimization
./claude-flow sparc smart-batch security-review "your task" --auto-optimize --adaptive
```

## Memory Integration (Enhanced)

### Standard Memory Operations
```bash
# Store mode-specific context
./claude-flow memory store "security-review_context" "important decisions" --namespace security-review

# Query previous work
./claude-flow memory query "security-review" --limit 5
```

### Batchtools Memory Operations
```bash
# Batch store multiple related contexts
./claude-flow memory batch-store "security-review_contexts.json" --namespace security-review --parallel

# Concurrent query across multiple namespaces
./claude-flow memory parallel-query "security-review" --namespaces security-review,project,arch --concurrent

# Export mode-specific memory with compression
./claude-flow memory export "security-review_backup.json" --namespace security-review --compress --parallel
```

## Performance Optimization Features

### Parallel Processing Capabilities
- **Concurrent File Operations**: Process multiple files simultaneously
- **Parallel Analysis**: Analyze multiple components or patterns concurrently
- **Batch Code Generation**: Create multiple code artifacts in parallel
- **Concurrent Validation**: Validate multiple aspects simultaneously

### Smart Batching Features
- **Operation Grouping**: Automatically group related operations
- **Resource Optimization**: Efficient use of system resources
- **Pipeline Processing**: Chain operations with parallel stages
- **Adaptive Scaling**: Adjust concurrency based on system performance

### Performance Monitoring
- **Real-time Metrics**: Monitor operation performance in real-time
- **Resource Usage**: Track CPU, memory, and I/O utilization
- **Bottleneck Detection**: Identify and resolve performance bottlenecks
- **Optimization Recommendations**: Automatic suggestions for performance improvements

## Batchtools Best Practices for 🛡️ Security Reviewer

### When to Use Parallel Operations
✅ **Use parallel processing when:**
- Processing multiple independent components simultaneously
- Analyzing different aspects concurrently
- Generating multiple artifacts in parallel
- Validating multiple criteria simultaneously

### Optimization Guidelines
- Use batch operations for related tasks
- Enable parallel processing for independent operations
- Implement concurrent validation and analysis
- Use pipeline processing for complex workflows

### Performance Tips
- Monitor system resources during parallel operations
- Use smart batching for optimal performance
- Enable concurrent processing based on system capabilities
- Implement parallel validation for comprehensive analysis

## Integration with Other SPARC Modes

### Concurrent Mode Execution
```bash
# Run multiple modes in parallel for comprehensive analysis
./claude-flow sparc concurrent security-review,architect,security-review "your project" --parallel

# Pipeline execution across multiple modes
./claude-flow sparc pipeline security-review->code->tdd "feature implementation" --optimize
```

### Batch Workflow Integration
```bash
# Execute complete workflow with batchtools optimization
./claude-flow sparc workflow security-review-workflow.json --batch-optimize --monitor
```

For detailed 🛡️ Security Reviewer documentation and batchtools integration guides, see: 
- Mode Guide: https://github.com/ruvnet/claude-code-flow/docs/sparc-security-review.md
- Batchtools Integration: https://github.com/ruvnet/claude-code-flow/docs/batchtools-security-review.md
