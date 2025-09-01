// SSBNK Hybrid Implementation - Reference Code Structure
// This file provides the complete Go implementation for the hybrid SSBNK architecture

package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "path/filepath"
    "sync"
    "time"
)

// =============================================================================
// CORE DATA STRUCTURES
// =============================================================================

type FileInfo struct {
    Name        string    `json:"name"`
    Path        string    `json:"path"`
    Size        int64     `json:"size"`
    ModTime     time.Time `json:"modTime"`
    Extension   string    `json:"extension"`
    ContentType string    `json:"contentType"`
}

type LatestFileResponse struct {
    File         FileInfo  `json:"file"`
    Source       string    `json:"source"`      // "metadata" | "filesystem" | "repaired"
    HealthStatus string    `json:"health"`      // "healthy" | "degraded" | "repaired"
    ResponseTime int64     `json:"responseMs"`
    Timestamp    time.Time `json:"timestamp"`
}

type ConsistencyReport struct {
    IsHealthy         bool      `json:"isHealthy"`
    FileCount         int       `json:"fileCount"`
    MetadataCount     int       `json:"metadataCount"`
    MissingInMetadata []string  `json:"missingInMetadata"`
    OrphanedMetadata  []string  `json:"orphanedMetadata"`
    LastCheck         time.Time `json:"lastCheck"`
    RepairNeeded      bool      `json:"repairNeeded"`
}

type SystemHealth struct {
    Status            string             `json:"status"`         // "healthy" | "degraded" | "critical"
    Timestamp         time.Time          `json:"timestamp"`
    Uptime            string             `json:"uptime"`
    MetadataHealth    string             `json:"metadataHealth"` // "healthy" | "degraded" | "failed"
    ConsistencyReport ConsistencyReport  `json:"consistency"`
    Performance       PerformanceMetrics `json:"performance"`
    LastRepair        *time.Time         `json:"lastRepair,omitempty"`
    Version           string             `json:"version"`
}

type PerformanceMetrics struct {
    AvgResponseTime     int64   `json:"avgResponseTimeMs"`
    MetadataHitRate     float64 `json:"metadataHitRate"`
    FilesystemFallbacks int64   `json:"filesystemFallbacks"`
    RequestsLast24h     int64   `json:"requestsLast24h"`
    ErrorsLast24h       int64   `json:"errorsLast24h"`
}

type MetadataEntry struct {
    Name      string    `json:"name"`
    Path      string    `json:"path"`
    Size      int64     `json:"size"`
    ModTime   time.Time `json:"modTime"`
    Extension string    `json:"extension"`
    Hash      string    `json:"hash,omitempty"`
}

// =============================================================================
// GLOBAL STATE AND CONFIGURATION
// =============================================================================

var (
    startTime       = time.Now()
    metadataHealthy = true
    healthMutex     sync.RWMutex
    
    // Performance tracking
    requestCount    int64
    errorCount      int64
    metadataHits    int64
    filesystemHits  int64
    responseTimes   []int64
    lastRepairTime  *time.Time
    
    // Configuration
    hostedDir     = "/data/hosted"
    metadataDir   = "/data/metadata"
    allowedExts   = []string{".png", ".gif", ".jpg", ".jpeg"}
    repairTimeout = 30 * time.Second
)

// =============================================================================
// 1. MAIN HYBRID HANDLER
// =============================================================================

func handleLatestHybrid(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    requestCount++
    
    // Step 1: Try fast metadata path
    if file, healthy := tryMetadataPath(); healthy {
        metadataHits++
        respondWithFile(w, file, "metadata", "healthy", time.Since(start))
        return
    }
    
    // Step 2: Degraded mode - use filesystem
    file := getLatestFromFilesystem()
    filesystemHits++
    
    // Step 3: Trigger async repair
    go triggerMetadataRepair()
    
    // Step 4: Return result with degraded status
    respondWithFile(w, file, "filesystem", "degraded", time.Since(start))
}

// =============================================================================
// 2. FAST PATH - METADATA LOOKUP
// =============================================================================

func tryMetadataPath() (FileInfo, bool) {
    // Quick health check
    if !isMetadataHealthy() {
        return FileInfo{}, false
    }
    
    // Load metadata files
    metadataFiles, err := loadMetadataFiles()
    if err != nil {
        log.Printf("Failed to load metadata: %v", err)
        markMetadataUnhealthy()
        return FileInfo{}, false
    }
    
    if len(metadataFiles) == 0 {
        markMetadataUnhealthy()
        return FileInfo{}, false
    }
    
    // Find latest file in metadata
    latest := findLatestInMetadata(metadataFiles)
    if latest.Name == "" {
        markMetadataUnhealthy()
        return FileInfo{}, false
    }
    
    // Verify file actually exists
    if !fileExists(latest.Path) {
        log.Printf("File referenced in metadata doesn't exist: %s", latest.Path)
        markMetadataUnhealthy()
        return FileInfo{}, false
    }
    
    return latest, true
}

func loadMetadataFiles() ([]MetadataEntry, error) {
    files, err := filepath.Glob(filepath.Join(metadataDir, "*.json"))
    if err != nil {
        return nil, err
    }
    
    var metadataFiles []MetadataEntry
    for _, file := range files {
        data, err := os.ReadFile(file)
        if err != nil {
            log.Printf("Failed to read metadata file %s: %v", file, err)
            continue
        }
        
        var entry MetadataEntry
        if err := json.Unmarshal(data, &entry); err != nil {
            log.Printf("Failed to parse metadata file %s: %v", file, err)
            continue
        }
        
        metadataFiles = append(metadataFiles, entry)
    }
    
    return metadataFiles, nil
}

func findLatestInMetadata(metadataFiles []MetadataEntry) FileInfo {
    if len(metadataFiles) == 0 {
        return FileInfo{}
    }
    
    var latest MetadataEntry
    var latestTime time.Time
    
    for _, entry := range metadataFiles {
        if entry.ModTime.After(latestTime) {
            latestTime = entry.ModTime
            latest = entry
        }
    }
    
    return FileInfo{
        Name:        latest.Name,
        Path:        latest.Path,
        Size:        latest.Size,
        ModTime:     latest.ModTime,
        Extension:   latest.Extension,
        ContentType: getContentType(latest.Extension),
    }
}

// =============================================================================
// 3. RELIABLE FALLBACK - FILESYSTEM SCAN
// =============================================================================

func handleLatestStateless(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    requestCount++
    filesystemHits++
    
    file := getLatestFromFilesystem()
    respondWithFile(w, file, "filesystem", "stateless", time.Since(start))
}

func getLatestFromFilesystem() FileInfo {
    // Create glob pattern for all allowed extensions
    patterns := make([]string, len(allowedExts))
    for i, ext := range allowedExts {
        patterns[i] = filepath.Join(hostedDir, "*"+ext)
    }
    
    var allFiles []string
    for _, pattern := range patterns {
        files, err := filepath.Glob(pattern)
        if err != nil {
            log.Printf("Glob error for pattern %s: %v", pattern, err)
            continue
        }
        allFiles = append(allFiles, files...)
    }
    
    if len(allFiles) == 0 {
        log.Printf("No files found in %s", hostedDir)
        return FileInfo{}
    }
    
    var latest FileInfo
    var latestTime time.Time
    
    for _, filePath := range allFiles {
        info, err := os.Stat(filePath)
        if err != nil {
            log.Printf("Failed to stat file %s: %v", filePath, err)
            continue
        }
        
        if info.ModTime().After(latestTime) {
            latestTime = info.ModTime()
            latest = FileInfo{
                Name:        info.Name(),
                Path:        filePath,
                Size:        info.Size(),
                ModTime:     info.ModTime(),
                Extension:   filepath.Ext(filePath),
                ContentType: getContentType(filepath.Ext(filePath)),
            }
        }
    }
    
    return latest
}

// =============================================================================
// 4. CONSISTENCY VALIDATION
// =============================================================================

func consistencyCheck() ConsistencyReport {
    report := ConsistencyReport{LastCheck: time.Now()}
    
    // Get filesystem files
    patterns := make([]string, len(allowedExts))
    for i, ext := range allowedExts {
        patterns[i] = filepath.Join(hostedDir, "*"+ext)
    }
    
    var fsFiles []string
    for _, pattern := range patterns {
        files, err := filepath.Glob(pattern)
        if err == nil {
            fsFiles = append(fsFiles, files...)
        }
    }
    report.FileCount = len(fsFiles)
    
    // Get metadata files
    metadataFiles, err := loadMetadataFiles()
    if err != nil {
        log.Printf("Failed to load metadata for consistency check: %v", err)
        report.MetadataCount = 0
    } else {
        report.MetadataCount = len(metadataFiles)
    }
    
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

// =============================================================================
// 5. SELF-HEALING METADATA REPAIR
// =============================================================================

func autoRepairMetadata() error {
    log.Printf("Starting metadata repair process")
    
    report := consistencyCheck()
    if report.IsHealthy {
        log.Printf("Metadata already healthy, no repair needed")
        return nil
    }
    
    // Create missing metadata entries
    for _, fileName := range report.MissingInMetadata {
        filePath := filepath.Join(hostedDir, fileName)
        if info, err := os.Stat(filePath); err == nil {
            metadata := createMetadataEntry(filePath, info)
            if err := saveMetadataEntry(metadata); err != nil {
                log.Printf("Failed to create metadata for %s: %v", fileName, err)
            } else {
                log.Printf("Created metadata for %s", fileName)
            }
        }
    }
    
    // Remove orphaned metadata
    for _, fileName := range report.OrphanedMetadata {
        if err := removeMetadataEntry(fileName); err != nil {
            log.Printf("Failed to remove orphaned metadata for %s: %v", fileName, err)
        } else {
            log.Printf("Removed orphaned metadata for %s", fileName)
        }
    }
    
    // Verify repair
    newReport := consistencyCheck()
    if newReport.IsHealthy {
        markMetadataHealthy()
        now := time.Now()
        lastRepairTime = &now
        log.Printf("Metadata repair completed successfully")
    } else {
        log.Printf("Metadata repair failed, inconsistencies remain: %d missing, %d orphaned",
            len(newReport.MissingInMetadata), len(newReport.OrphanedMetadata))
        return fmt.Errorf("repair failed: %d missing, %d orphaned",
            len(newReport.MissingInMetadata), len(newReport.OrphanedMetadata))
    }
    
    return nil
}

func createMetadataEntry(filePath string, info os.FileInfo) MetadataEntry {
    return MetadataEntry{
        Name:      info.Name(),
        Path:      filePath,
        Size:      info.Size(),
        ModTime:   info.ModTime(),
        Extension: filepath.Ext(filePath),
    }
}

func saveMetadataEntry(entry MetadataEntry) error {
    metadataPath := filepath.Join(metadataDir, entry.Name+".json")
    data, err := json.MarshalIndent(entry, "", "  ")
    if err != nil {
        return err
    }
    
    // Ensure metadata directory exists
    if err := os.MkdirAll(metadataDir, 0755); err != nil {
        return err
    }
    
    return os.WriteFile(metadataPath, data, 0644)
}

func removeMetadataEntry(fileName string) error {
    metadataPath := filepath.Join(metadataDir, fileName+".json")
    return os.Remove(metadataPath)
}

func triggerMetadataRepair() {
    go func() {
        if err := autoRepairMetadata(); err != nil {
            log.Printf("Async metadata repair failed: %v", err)
        }
    }()
}

// =============================================================================
// 6. HEALTH MONITORING
// =============================================================================

func handleHealth(w http.ResponseWriter, r *http.Request) {
    health := SystemHealth{
        Timestamp:         time.Now(),
        Uptime:            time.Since(startTime).String(),
        ConsistencyReport: consistencyCheck(),
        Performance:       getPerformanceMetrics(),
        Version:           "2.0.0-hybrid",
        LastRepair:        lastRepairTime,
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
    w.Header().Set("Cache-Control", "no-cache")
    json.NewEncoder(w).Encode(health)
}

func getPerformanceMetrics() PerformanceMetrics {
    var avgResponseTime int64
    if len(responseTimes) > 0 {
        var sum int64
        for _, rt := range responseTimes {
            sum += rt
        }
        avgResponseTime = sum / int64(len(responseTimes))
    }
    
    var hitRate float64
    totalHits := metadataHits + filesystemHits
    if totalHits > 0 {
        hitRate = float64(metadataHits) / float64(totalHits)
    }
    
    return PerformanceMetrics{
        AvgResponseTime:     avgResponseTime,
        MetadataHitRate:     hitRate,
        FilesystemFallbacks: filesystemHits,
        RequestsLast24h:     requestCount, // Simplified - in reality, track 24h window
        ErrorsLast24h:       errorCount,   // Simplified - in reality, track 24h window
    }
}

// =============================================================================
// 7. BACKGROUND SYNC PROCESS
// =============================================================================

func startBackgroundSync() {
    ticker := time.NewTicker(5 * time.Minute)
    go func() {
        for range ticker.C {
            if !isMetadataHealthy() {
                log.Printf("Background sync: Metadata unhealthy, triggering repair")
                if err := autoRepairMetadata(); err != nil {
                    log.Printf("Background repair failed: %v", err)
                } else {
                    log.Printf("Background repair completed")
                }
            } else {
                // Periodic health check
                report := consistencyCheck()
                if !report.IsHealthy {
                    log.Printf("Background sync: Inconsistency detected (%d missing, %d orphaned), scheduling repair",
                        len(report.MissingInMetadata), len(report.OrphanedMetadata))
                    go triggerMetadataRepair()
                }
            }
        }
    }()
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

func isMetadataHealthy() bool {
    healthMutex.RLock()
    defer healthMutex.RUnlock()
    return metadataHealthy
}

func markMetadataHealthy() {
    healthMutex.Lock()
    defer healthMutex.Unlock()
    metadataHealthy = true
}

func markMetadataUnhealthy() {
    healthMutex.Lock()
    defer healthMutex.Unlock()
    metadataHealthy = false
}

func fileExists(path string) bool {
    _, err := os.Stat(path)
    return err == nil
}

func getContentType(ext string) string {
    switch ext {
    case ".png":
        return "image/png"
    case ".jpg", ".jpeg":
        return "image/jpeg"
    case ".gif":
        return "image/gif"
    default:
        return "application/octet-stream"
    }
}

func respondWithFile(w http.ResponseWriter, file FileInfo, source, health string, responseTime time.Duration) {
    response := LatestFileResponse{
        File:         file,
        Source:       source,
        HealthStatus: health,
        ResponseTime: responseTime.Milliseconds(),
        Timestamp:    time.Now(),
    }
    
    // Track response time
    responseTimes = append(responseTimes, responseTime.Milliseconds())
    if len(responseTimes) > 100 { // Keep only last 100 measurements
        responseTimes = responseTimes[1:]
    }
    
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(response); err != nil {
        log.Printf("Failed to encode response: %v", err)
        errorCount++
        http.Error(w, "Internal server error", http.StatusInternalServerError)
    }
}

// =============================================================================
// MAIN SERVER SETUP
// =============================================================================

func main() {
    log.Printf("Starting SSBNK Hybrid Server v2.0.0")
    
    // Start background processes
    startBackgroundSync()
    
    // Register handlers
    http.HandleFunc("/latest", handleLatestHybrid)
    http.HandleFunc("/latest/stateless", handleLatestStateless)
    http.HandleFunc("/health", handleHealth)
    
    log.Printf("Server starting on :8080")
    log.Printf("Hosted directory: %s", hostedDir)
    log.Printf("Metadata directory: %s", metadataDir)
    
    // Initial consistency check
    report := consistencyCheck()
    log.Printf("Initial consistency check: %d files, %d metadata entries, healthy=%v",
        report.FileCount, report.MetadataCount, report.IsHealthy)
    
    if !report.IsHealthy {
        log.Printf("System starting in degraded mode - repair will be attempted")
        go triggerMetadataRepair()
    }
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}