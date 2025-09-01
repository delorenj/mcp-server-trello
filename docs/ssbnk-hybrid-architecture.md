# SSBNK Hybrid Architecture Specification

## Executive Summary

The SSBNK system suffers from metadata fragility where `handleLatest()` breaks when metadata file count doesn't match actual hosted files. This hybrid architecture eliminates single points of failure by using metadata for performance while maintaining filesystem-based fallbacks and self-healing capabilities.

## Problem Analysis

### Current Fragility Points
- **Metadata Dependency**: `handleLatest()` completely relies on metadata files
- **Count Mismatch**: 23 hosted files vs initially 1 metadata file (now fixed to 23)
- **No Fallback**: System fails when metadata is inconsistent
- **Silent Failures**: No health monitoring or automatic recovery

### Business Impact
- **Zero Tolerance**: User demands "bulletproof system that never breaks"
- **Performance**: Metadata provides fast lookups
- **Reliability**: Filesystem is source of truth

## Hybrid Architecture Design

### Core Principle: "Fast Path + Safe Fallback"
1. **Primary Path**: Use metadata for performance (happy path)
2. **Validation**: Continuous consistency checking
3. **Fallback Path**: Filesystem scan when metadata unreliable
4. **Self-Healing**: Automatic metadata repair
5. **Monitoring**: Health endpoints for observability

## Component Architecture

### 1. Main Handler: `handleLatestHybrid()`

```go
type LatestFileResponse struct {
    File         FileInfo    `json:"file"`
    Source       string      `json:"source"`      // "metadata" | "filesystem" | "repaired"
    HealthStatus string      `json:"health"`      // "healthy" | "degraded" | "repaired"
    ResponseTime int64       `json:"responseMs"`
    Timestamp    time.Time   `json:"timestamp"`
}

type FileInfo struct {
    Name         string    `json:"name"`
    Path         string    `json:"path"`
    Size         int64     `json:"size"`
    ModTime      time.Time `json:"modTime"`
    Extension    string    `json:"extension"`
    ContentType  string    `json:"contentType"`
}

func handleLatestHybrid(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    
    // Step 1: Try fast metadata path
    if file, healthy := tryMetadataPath(); healthy {
        respondWithFile(w, file, "metadata", "healthy", time.Since(start))
        return
    }
    
    // Step 2: Degraded mode - use filesystem
    file := getLatestFromFilesystem()
    
    // Step 3: Trigger async repair
    go triggerMetadataRepair()
    
    // Step 4: Return result with degraded status
    respondWithFile(w, file, "filesystem", "degraded", time.Since(start))
}
```

### 2. Fast Path: `tryMetadataPath()`

```go
func tryMetadataPath() (FileInfo, bool) {
    // Quick consistency check
    if !isMetadataHealthy() {
        return FileInfo{}, false
    }
    
    // Get latest from metadata
    metadata, err := loadMetadataFiles()
    if err != nil {
        return FileInfo{}, false
    }
    
    latest := findLatestInMetadata(metadata)
    
    // Verify file actually exists
    if !fileExists(latest.Path) {
        markMetadataUnhealthy()
        return FileInfo{}, false
    }
    
    return latest, true
}
```

### 3. Reliable Fallback: `handleLatestStateless()`

```go
func handleLatestStateless(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    file := getLatestFromFilesystem()
    respondWithFile(w, file, "filesystem", "stateless", time.Since(start))
}

func getLatestFromFilesystem() FileInfo {
    files, err := filepath.Glob("/data/hosted/*.{png,gif,jpg}")
    if err != nil || len(files) == 0 {
        return FileInfo{} // Handle empty case
    }
    
    var latest FileInfo
    var latestTime time.Time
    
    for _, filePath := range files {
        if info, err := os.Stat(filePath); err == nil {
            if info.ModTime().After(latestTime) {
                latestTime = info.ModTime()
                latest = FileInfo{
                    Name:        info.Name(),
                    Path:        filePath,
                    Size:        info.Size(),
                    ModTime:     info.ModTime(),
                    Extension:   filepath.Ext(filePath),
                    ContentType: getContentType(filePath),
                }
            }
        }
    }
    
    return latest
}
```

### 4. Consistency Validation: `consistencyCheck()`

```go
type ConsistencyReport struct {
    IsHealthy           bool                `json:"isHealthy"`
    FileCount          int                 `json:"fileCount"`
    MetadataCount      int                 `json:"metadataCount"`
    MissingInMetadata  []string            `json:"missingInMetadata"`
    OrphanedMetadata   []string            `json:"orphanedMetadata"`
    LastCheck          time.Time           `json:"lastCheck"`
    RepairNeeded       bool                `json:"repairNeeded"`
}

func consistencyCheck() ConsistencyReport {
    report := ConsistencyReport{LastCheck: time.Now()}
    
    // Get filesystem files
    fsFiles, _ := filepath.Glob("/data/hosted/*.{png,gif,jpg}")
    report.FileCount = len(fsFiles)
    
    // Get metadata files
    metadataFiles, _ := loadMetadataFiles()
    report.MetadataCount = len(metadataFiles)
    
    // Create lookup maps
    fsMap := make(map[string]bool)
    for _, file := range fsFiles {
        fsMap[filepath.Base(file)] = true
    }
    
    metaMap := make(map[string]bool)
    for _, meta := range metadataFiles {
        metaMap[meta.Name] = true
        
        // Check if file exists
        if !fsMap[meta.Name] {
            report.OrphanedMetadata = append(report.OrphanedMetadata, meta.Name)
        }
    }
    
    // Check for missing metadata
    for file := range fsMap {
        if !metaMap[file] {
            report.MissingInMetadata = append(report.MissingInMetadata, file)
        }
    }
    
    // Determine health
    report.IsHealthy = len(report.MissingInMetadata) == 0 && len(report.OrphanedMetadata) == 0
    report.RepairNeeded = !report.IsHealthy
    
    return report
}
```

### 5. Self-Healing: `autoRepairMetadata()`

```go
func autoRepairMetadata() error {
    log.Info("Starting metadata repair process")
    
    report := consistencyCheck()
    if report.IsHealthy {
        log.Info("Metadata already healthy, no repair needed")
        return nil
    }
    
    // Create missing metadata entries
    for _, fileName := range report.MissingInMetadata {
        filePath := fmt.Sprintf("/data/hosted/%s", fileName)
        if info, err := os.Stat(filePath); err == nil {
            metadata := createMetadataEntry(filePath, info)
            if err := saveMetadataEntry(metadata); err != nil {
                log.Error("Failed to create metadata for", fileName, err)
            } else {
                log.Info("Created metadata for", fileName)
            }
        }
    }
    
    // Remove orphaned metadata
    for _, fileName := range report.OrphanedMetadata {
        if err := removeMetadataEntry(fileName); err != nil {
            log.Error("Failed to remove orphaned metadata for", fileName, err)
        } else {
            log.Info("Removed orphaned metadata for", fileName)
        }
    }
    
    // Verify repair
    newReport := consistencyCheck()
    if newReport.IsHealthy {
        markMetadataHealthy()
        log.Info("Metadata repair completed successfully")
    } else {
        log.Error("Metadata repair failed, inconsistencies remain")
        return fmt.Errorf("repair failed: %d missing, %d orphaned", 
            len(newReport.MissingInMetadata), len(newReport.OrphanedMetadata))
    }
    
    return nil
}
```

### 6. Health Monitoring: `/health` Endpoint

```go
type SystemHealth struct {
    Status              string              `json:"status"`         // "healthy" | "degraded" | "critical"
    Timestamp           time.Time           `json:"timestamp"`
    Uptime              string              `json:"uptime"`
    MetadataHealth      string              `json:"metadataHealth"` // "healthy" | "degraded" | "failed"
    ConsistencyReport   ConsistencyReport   `json:"consistency"`
    Performance         PerformanceMetrics  `json:"performance"`
    LastRepair          *time.Time          `json:"lastRepair,omitempty"`
    Version             string              `json:"version"`
}

type PerformanceMetrics struct {
    AvgResponseTime     int64   `json:"avgResponseTimeMs"`
    MetadataHitRate     float64 `json:"metadataHitRate"`
    FilesystemFallbacks int64   `json:"filesystemFallbacks"`
    RequestsLast24h     int64   `json:"requestsLast24h"`
    ErrorsLast24h       int64   `json:"errorsLast24h"`
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
    health := SystemHealth{
        Timestamp:       time.Now(),
        Uptime:          time.Since(startTime).String(),
        ConsistencyReport: consistencyCheck(),
        Performance:     getPerformanceMetrics(),
        Version:         "2.0.0-hybrid",
    }
    
    // Determine overall status
    if health.ConsistencyReport.IsHealthy {
        health.Status = "healthy"
        health.MetadataHealth = "healthy"
    } else if len(health.ConsistencyReport.MissingInMetadata) <= 5 {
        health.Status = "degraded"
        health.MetadataHealth = "degraded"
    } else {
        health.Status = "critical"
        health.MetadataHealth = "failed"
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(health)
}
```

### 7. Background Sync Process

```go
func startBackgroundSync() {
    ticker := time.NewTicker(5 * time.Minute)
    go func() {
        for range ticker.C {
            if !isMetadataHealthy() {
                log.Info("Background sync: Metadata unhealthy, triggering repair")
                if err := autoRepairMetadata(); err != nil {
                    log.Error("Background repair failed:", err)
                } else {
                    log.Info("Background repair completed")
                }
            } else {
                // Periodic health check
                report := consistencyCheck()
                if !report.IsHealthy {
                    log.Warn("Background sync: Inconsistency detected, scheduling repair")
                    go autoRepairMetadata()
                }
            }
        }
    }()
}
```

## Data Flow Diagrams

### Normal Operation (Metadata Path)
```
Request → handleLatestHybrid() → tryMetadataPath() → isMetadataHealthy() ✓
                                                  → loadMetadataFiles() ✓
                                                  → findLatestInMetadata() ✓
                                                  → fileExists() ✓
                                → respondWithFile("metadata", "healthy")
```

### Degraded Operation (Filesystem Fallback)
```
Request → handleLatestHybrid() → tryMetadataPath() → isMetadataHealthy() ✗
                                → getLatestFromFilesystem() ✓
                                → triggerMetadataRepair() (async)
                                → respondWithFile("filesystem", "degraded")
```

### Self-Healing Process
```
triggerMetadataRepair() → autoRepairMetadata() → consistencyCheck()
                                                → createMetadataEntry() (for missing)
                                                → removeMetadataEntry() (for orphaned)
                                                → markMetadataHealthy()
```

## Failure Recovery Paths

### 1. Metadata File Corruption
- **Detection**: JSON parsing fails in `loadMetadataFiles()`
- **Recovery**: Fallback to filesystem, regenerate metadata
- **Prevention**: Atomic writes, backup copies

### 2. Metadata-Filesystem Mismatch
- **Detection**: `consistencyCheck()` reports discrepancies
- **Recovery**: Auto-repair creates/removes metadata entries
- **Prevention**: Background sync every 5 minutes

### 3. Complete Metadata Loss
- **Detection**: Metadata directory missing/empty
- **Recovery**: Full regeneration from filesystem
- **Prevention**: Periodic backups, version control

### 4. Filesystem Issues
- **Detection**: `fileExists()` fails, `os.Stat()` errors
- **Recovery**: Remove invalid metadata, use best available data
- **Prevention**: File system monitoring, alerts

## Operational Procedures

### Deployment
1. Deploy new hybrid handlers alongside existing
2. Configure health monitoring alerts
3. Start background sync process
4. Route traffic to hybrid endpoint
5. Monitor health dashboard

### Monitoring
- **Health Endpoint**: `/health` every 30 seconds
- **Metrics**: Response times, hit rates, error counts
- **Alerts**: Degraded status > 5 minutes, critical status immediately

### Maintenance
- **Daily**: Review health reports, performance metrics
- **Weekly**: Analyze fallback frequency, optimize metadata
- **Monthly**: Backup metadata, filesystem audits

## Performance Characteristics

### Expected Performance
- **Metadata Path**: ~1-5ms response time
- **Filesystem Path**: ~10-50ms response time
- **Repair Process**: ~100-500ms (async)
- **Health Check**: ~10-20ms

### Scalability
- **Files**: Supports thousands of files efficiently
- **Metadata**: Sharded JSON files for large collections
- **Concurrency**: Thread-safe operations, minimal locking

## Security Considerations

### File Access
- Validate all file paths to prevent directory traversal
- Restrict access to `/data/hosted/` directory only
- Sanitize file names in responses

### Metadata Integrity
- Validate JSON structure on load
- Check file permissions before repair
- Log all metadata modifications

## Testing Strategy

### Unit Tests
- Each component function independently
- Mock filesystem for reproducible tests
- Error condition handling

### Integration Tests
- Full hybrid flow testing
- Consistency check accuracy
- Repair process effectiveness

### Chaos Testing
- Corrupt metadata files
- Delete random files
- Simulate high load

## Success Metrics

### Reliability
- **Zero Downtime**: Never return 5xx errors due to metadata issues
- **Auto-Recovery**: 95%+ successful repairs within 5 minutes
- **Data Integrity**: 100% consistency between metadata and filesystem

### Performance
- **Fast Path**: 90%+ requests use metadata (target <5ms)
- **Fallback Path**: <50ms filesystem response time
- **Repair Time**: Complete repair within 30 seconds

### Observability
- **Health Monitoring**: Real-time status visibility
- **Performance Metrics**: Comprehensive request analytics
- **Alerting**: Proactive issue detection

## Implementation Phases

### Phase 1: Core Hybrid Logic
1. Implement `handleLatestHybrid()` with basic fallback
2. Add `handleLatestStateless()` as pure filesystem handler
3. Create health endpoint with basic status

### Phase 2: Consistency & Repair
1. Implement `consistencyCheck()` with detailed reporting
2. Add `autoRepairMetadata()` with comprehensive healing
3. Background sync process with scheduling

### Phase 3: Monitoring & Operations
1. Enhanced health endpoint with performance metrics
2. Logging, alerting, and operational dashboards
3. Performance optimization and fine-tuning

This architecture ensures the SSBNK system becomes truly bulletproof - fast when possible, reliable always, and self-healing by design.