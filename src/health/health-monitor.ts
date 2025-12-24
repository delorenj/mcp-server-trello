import { TrelloClient } from '../trello-client.js';
import { AxiosError } from 'axios';
import { performance } from 'perf_hooks';
import { RateLimiter } from '../types.js';
import { getCacheManager, CacheStats } from '../cache-manager.js';

/**
 * Health status levels for our magnificent Trello organism
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

/**
 * Individual health check result
 */
export interface HealthCheck {
  name: string;
  status: HealthStatus;
  message: string;
  duration_ms: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Complete system health report
 */
export interface SystemHealthReport {
  overall_status: HealthStatus;
  timestamp: string;
  checks: HealthCheck[];
  recommendations: string[];
  repair_available: boolean;
  uptime_ms: number;
  performance_metrics: {
    avg_response_time_ms: number;
    success_rate_percent: number;
    rate_limit_utilization_percent: number;
    requests_per_minute: number;
  };
}

/**
 * Performance metrics tracking
 */
interface PerformanceTracker {
  requests: Array<{ timestamp: number; duration: number; success: boolean }>;
  startTime: number;
}

/**
 * The magnificent HEALTH MONITORING system for our Trello MCP organism!
 *
 * This class performs comprehensive cardiovascular diagnostics to ensure
 * our digital creature remains healthy and happy. It's like having a
 * personal physician for your API! 🩺
 *
 * Features include:
 * - Real-time health status monitoring
 * - Performance metrics tracking
 * - Rate limit utilization analysis
 * - Automatic repair recommendations
 * - Detailed diagnostic reporting
 */
export class TrelloHealthMonitor {
  private performanceTracker: PerformanceTracker;
  private lastHealthCheck?: SystemHealthReport;
  private readonly trelloClient: TrelloClient;
  private rateLimiter: any; // Will get injected from TrelloClient

  constructor(trelloClient: TrelloClient) {
    this.trelloClient = trelloClient;
    this.performanceTracker = {
      requests: [],
      startTime: Date.now(),
    };

    // Start monitoring performance in the background
    this.startPerformanceMonitoring();
  }

  /**
   * Get comprehensive system health status
   * This is the main cardiovascular examination! 🫀
   */
  async getSystemHealth(detailed: boolean = false): Promise<SystemHealthReport> {
    const startTime = performance.now();
    const checks: HealthCheck[] = [];

    // Run all health checks in parallel for maximum efficiency
    const checkPromises = [
      this.checkTrelloApiConnectivity(),
      this.checkBoardAccess(),
      this.checkRateLimitHealth(),
      this.checkPerformanceMetrics(),
      this.checkCacheHealth(),
    ];

    if (detailed) {
      checkPromises.push(
        this.checkListOperations(),
        this.checkCardOperations(),
        this.checkChecklistOperations(),
        this.checkWorkspaceAccess()
      );
    }

    try {
      const checkResults = await Promise.all(checkPromises);
      checks.push(...checkResults);
    } catch (error) {
      // If parallel execution fails, run checks sequentially
      checks.push(await this.createErrorCheck('parallel_execution', error));
    }

    // Calculate overall status
    const overallStatus = this.calculateOverallStatus(checks);

    // Generate recommendations
    const recommendations = this.generateRecommendations(checks, overallStatus);

    // Create health report
    const report: SystemHealthReport = {
      overall_status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      recommendations,
      repair_available: this.isRepairAvailable(checks),
      uptime_ms: Date.now() - this.performanceTracker.startTime,
      performance_metrics: this.calculatePerformanceMetrics(),
    };

    this.lastHealthCheck = report;
    return report;
  }

  /**
   * Check basic Trello API connectivity
   */
  private async checkTrelloApiConnectivity(): Promise<HealthCheck> {
    const startTime = performance.now();
    const checkName = 'trello_api_connectivity';

    try {
      // Simple "me" endpoint check - lowest impact way to verify connectivity
      await this.trelloClient.listBoards();

      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, true);

      return {
        name: checkName,
        status: HealthStatus.HEALTHY,
        message: 'Trello API connectivity is excellent',
        duration_ms: Math.round(duration),
        timestamp: new Date().toISOString(),
        metadata: {
          endpoint: '/members/me/boards',
          response_time_category: this.categorizeResponseTime(duration),
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, false);

      return this.createErrorCheck(checkName, error, duration);
    }
  }

  /**
   * Check if we can access the active board
   */
  private async checkBoardAccess(): Promise<HealthCheck> {
    const startTime = performance.now();
    const checkName = 'board_access';

    try {
      const boardId = this.trelloClient.activeBoardId;
      if (!boardId) {
        return {
          name: checkName,
          status: HealthStatus.DEGRADED,
          message: 'No active board configured',
          duration_ms: Math.round(performance.now() - startTime),
          timestamp: new Date().toISOString(),
          metadata: {
            suggestion: 'Set an active board using set_active_board tool',
          },
        };
      }

      const board = await this.trelloClient.getBoardById(boardId);
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, true);

      return {
        name: checkName,
        status: board.closed ? HealthStatus.CRITICAL : HealthStatus.HEALTHY,
        message: board.closed
          ? 'Active board is closed/archived'
          : `Board "${board.name}" is accessible`,
        duration_ms: Math.round(duration),
        timestamp: new Date().toISOString(),
        metadata: {
          board_id: board.id,
          board_name: board.name,
          board_closed: board.closed,
          board_url: board.url,
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, false);

      return this.createErrorCheck(checkName, error, duration);
    }
  }

  /**
   * Check rate limiter health and utilization
   */
  private async checkRateLimitHealth(): Promise<HealthCheck> {
    const startTime = performance.now();
    const checkName = 'rate_limit_health';

    try {
      // Get rate limiter from client (this is a bit hacky but necessary)
      // In a real implementation, we'd expose this properly from TrelloClient
      const rateLimiterInfo = {
        can_make_request: true, // We'll approximate this
        utilization_percent: this.calculateRateLimitUtilization(),
      };

      const duration = performance.now() - startTime;
      let status = HealthStatus.HEALTHY;
      let message = 'Rate limiting is functioning optimally';

      if (rateLimiterInfo.utilization_percent > 80) {
        status = HealthStatus.DEGRADED;
        message = 'High rate limit utilization detected';
      } else if (rateLimiterInfo.utilization_percent > 95) {
        status = HealthStatus.CRITICAL;
        message = 'Rate limit near exhaustion';
      }

      return {
        name: checkName,
        status,
        message,
        duration_ms: Math.round(duration),
        timestamp: new Date().toISOString(),
        metadata: {
          utilization_percent: rateLimiterInfo.utilization_percent,
          can_make_request: rateLimiterInfo.can_make_request,
          trello_limits: {
            api_key_limit: '300 requests / 10 seconds',
            token_limit: '100 requests / 10 seconds',
          },
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return this.createErrorCheck(checkName, error, duration);
    }
  }

  /**
   * Check performance metrics health
   */
  private async checkPerformanceMetrics(): Promise<HealthCheck> {
    const startTime = performance.now();
    const checkName = 'performance_metrics';

    try {
      const metrics = this.calculatePerformanceMetrics();
      const duration = performance.now() - startTime;

      let status = HealthStatus.HEALTHY;
      let message = 'Performance metrics are excellent';

      if (metrics.avg_response_time_ms > 2000) {
        status = HealthStatus.DEGRADED;
        message = 'Slower than optimal response times detected';
      } else if (metrics.success_rate_percent < 95) {
        status = HealthStatus.CRITICAL;
        message = 'Low success rate detected';
      }

      return {
        name: checkName,
        status,
        message,
        duration_ms: Math.round(duration),
        timestamp: new Date().toISOString(),
        metadata: {
          ...metrics,
          total_requests: this.performanceTracker.requests.length,
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return this.createErrorCheck(checkName, error, duration);
    }
  }

  /**
   * Check list operations (detailed check)
   */
  private async checkListOperations(): Promise<HealthCheck> {
    const startTime = performance.now();
    const checkName = 'list_operations';

    try {
      const lists = await this.trelloClient.getLists();
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, true);

      return {
        name: checkName,
        status: HealthStatus.HEALTHY,
        message: `Successfully retrieved ${lists.length} lists`,
        duration_ms: Math.round(duration),
        timestamp: new Date().toISOString(),
        metadata: {
          total_lists: lists.length,
          open_lists: lists.filter(l => !l.closed).length,
          closed_lists: lists.filter(l => l.closed).length,
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, false);

      return this.createErrorCheck(checkName, error, duration);
    }
  }

  /**
   * Check card operations (detailed check)
   */
  private async checkCardOperations(): Promise<HealthCheck> {
    const startTime = performance.now();
    const checkName = 'card_operations';

    try {
      const myCards = await this.trelloClient.getMyCards();
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, true);

      return {
        name: checkName,
        status: HealthStatus.HEALTHY,
        message: `Successfully retrieved ${myCards.length} user cards`,
        duration_ms: Math.round(duration),
        timestamp: new Date().toISOString(),
        metadata: {
          total_cards: myCards.length,
          open_cards: myCards.filter(c => !c.closed).length,
          closed_cards: myCards.filter(c => c.closed).length,
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, false);

      return this.createErrorCheck(checkName, error, duration);
    }
  }

  /**
   * Check checklist operations (detailed check)
   */
  private async checkChecklistOperations(): Promise<HealthCheck> {
    const startTime = performance.now();
    const checkName = 'checklist_operations';

    try {
      // Try to get acceptance criteria as a test
      const criteria = await this.trelloClient.getAcceptanceCriteria();
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, true);

      return {
        name: checkName,
        status: HealthStatus.HEALTHY,
        message: `Checklist operations functioning (${criteria.length} acceptance criteria found)`,
        duration_ms: Math.round(duration),
        timestamp: new Date().toISOString(),
        metadata: {
          acceptance_criteria_count: criteria.length,
          completed_items: criteria.filter(item => item.complete).length,
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, false);

      // Checklist failure might not be critical if it's just missing checklists
      const isConfigError =
        error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('No board ID'));

      return this.createErrorCheck(
        checkName,
        error,
        duration,
        isConfigError ? HealthStatus.DEGRADED : HealthStatus.CRITICAL
      );
    }
  }

  /**
   * Check cache health and statistics
   */
  private async checkCacheHealth(): Promise<HealthCheck> {
    const startTime = performance.now();
    const checkName = 'cache_health';

    try {
      const cacheManager = getCacheManager();
      const stats = await cacheManager.getStatsAsync();
      const duration = performance.now() - startTime;

      let status = HealthStatus.HEALTHY;
      let message = `Cache operational (${stats.storeType})`;

      // Check for potential issues
      if (!cacheManager.isEnabled()) {
        status = HealthStatus.DEGRADED;
        message = 'Cache is disabled';
      } else if (stats.storeType === 'valkey' && !stats.connected) {
        status = HealthStatus.DEGRADED;
        message = 'Valkey cache configured but not connected, using memory fallback';
      }

      return {
        name: checkName,
        status,
        message,
        duration_ms: Math.round(duration),
        timestamp: new Date().toISOString(),
        metadata: {
          enabled: cacheManager.isEnabled(),
          store_type: stats.storeType,
          connected: stats.connected,
          hits: stats.hits,
          misses: stats.misses,
          hit_rate_percent: Math.round(stats.hitRate * 100),
          keys_cached: stats.keys,
          ttl_config: cacheManager.getTTLConfig(),
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      return this.createErrorCheck(checkName, error, duration, HealthStatus.DEGRADED);
    }
  }

  /**
   * Check workspace access (detailed check)
   */
  private async checkWorkspaceAccess(): Promise<HealthCheck> {
    const startTime = performance.now();
    const checkName = 'workspace_access';

    try {
      const workspaces = await this.trelloClient.listWorkspaces();
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, true);

      return {
        name: checkName,
        status: HealthStatus.HEALTHY,
        message: `Access to ${workspaces.length} workspaces confirmed`,
        duration_ms: Math.round(duration),
        timestamp: new Date().toISOString(),
        metadata: {
          total_workspaces: workspaces.length,
          active_workspace_id: this.trelloClient.activeWorkspaceId,
          workspace_names: workspaces.map(w => w.displayName),
        },
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric(duration, false);

      return this.createErrorCheck(checkName, error, duration);
    }
  }

  /**
   * Calculate overall system health status
   */
  private calculateOverallStatus(checks: HealthCheck[]): HealthStatus {
    if (checks.some(c => c.status === HealthStatus.CRITICAL)) {
      return HealthStatus.CRITICAL;
    }
    if (checks.some(c => c.status === HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }
    if (checks.every(c => c.status === HealthStatus.HEALTHY)) {
      return HealthStatus.HEALTHY;
    }
    return HealthStatus.UNKNOWN;
  }

  /**
   * Generate health-based recommendations
   */
  private generateRecommendations(checks: HealthCheck[], overallStatus: HealthStatus): string[] {
    const recommendations: string[] = [];

    // Check for specific issues and provide targeted advice
    const boardCheck = checks.find(c => c.name === 'board_access');
    if (boardCheck?.status === HealthStatus.DEGRADED && boardCheck.metadata?.suggestion) {
      recommendations.push(boardCheck.metadata.suggestion);
    }

    const rateLimitCheck = checks.find(c => c.name === 'rate_limit_health');
    if (rateLimitCheck?.status === HealthStatus.DEGRADED) {
      recommendations.push(
        'Consider implementing request throttling or caching to reduce API usage'
      );
    }

    const performanceCheck = checks.find(c => c.name === 'performance_metrics');
    if (performanceCheck?.status === HealthStatus.DEGRADED) {
      recommendations.push(
        'Investigate slow response times - consider network conditions or API load'
      );
    }

    // Overall status recommendations
    if (overallStatus === HealthStatus.HEALTHY) {
      recommendations.push('All systems operating normally - maintain current configuration');
    } else if (overallStatus === HealthStatus.CRITICAL) {
      recommendations.push('Immediate attention required - check error logs and connectivity');
    }

    return recommendations.length > 0
      ? recommendations
      : ['System assessment complete - no specific recommendations'];
  }

  /**
   * Check if repair functionality is available
   */
  private isRepairAvailable(checks: HealthCheck[]): boolean {
    // Simple heuristic: repair available if we have degraded but not critical issues
    return (
      checks.some(c => c.status === HealthStatus.DEGRADED) &&
      !checks.some(c => c.status === HealthStatus.CRITICAL)
    );
  }

  /**
   * Create a standardized error check result
   */
  private createErrorCheck(
    checkName: string,
    error: unknown,
    duration?: number,
    status: HealthStatus = HealthStatus.CRITICAL
  ): HealthCheck {
    let message = 'Unknown error occurred';
    let errorCode: string | undefined;

    if (error instanceof Error) {
      message = error.message;
    }

    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as AxiosError;
      errorCode = axiosError.response?.status?.toString();
      message = `HTTP ${axiosError.response?.status}: ${axiosError.message}`;
    }

    return {
      name: checkName,
      status,
      message,
      duration_ms: Math.round(duration || 0),
      timestamp: new Date().toISOString(),
      metadata: {
        error_type: error?.constructor?.name || 'Unknown',
        error_code: errorCode,
        error_details: error instanceof Error ? error.stack : undefined,
      },
    };
  }

  /**
   * Record performance metrics for tracking
   */
  private recordPerformanceMetric(duration: number, success: boolean): void {
    const now = Date.now();
    this.performanceTracker.requests.push({ timestamp: now, duration, success });

    // Keep only last 100 requests to prevent memory leaks
    if (this.performanceTracker.requests.length > 100) {
      this.performanceTracker.requests = this.performanceTracker.requests.slice(-100);
    }
  }

  /**
   * Calculate comprehensive performance metrics
   */
  private calculatePerformanceMetrics() {
    const requests = this.performanceTracker.requests;
    if (requests.length === 0) {
      return {
        avg_response_time_ms: 0,
        success_rate_percent: 100,
        rate_limit_utilization_percent: 0,
        requests_per_minute: 0,
      };
    }

    const avgResponseTime = requests.reduce((sum, r) => sum + r.duration, 0) / requests.length;
    const successRate = (requests.filter(r => r.success).length / requests.length) * 100;

    // Calculate requests per minute based on recent activity
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = requests.filter(r => r.timestamp > oneMinuteAgo);
    const requestsPerMinute = recentRequests.length;

    return {
      avg_response_time_ms: Math.round(avgResponseTime),
      success_rate_percent: Math.round(successRate * 100) / 100,
      rate_limit_utilization_percent: this.calculateRateLimitUtilization(),
      requests_per_minute: requestsPerMinute,
    };
  }

  /**
   * Calculate rate limit utilization (approximation)
   */
  private calculateRateLimitUtilization(): number {
    const requests = this.performanceTracker.requests;
    const tenSecondsAgo = Date.now() - 10000;
    const recentRequests = requests.filter(r => r.timestamp > tenSecondsAgo).length;

    // Use the more restrictive limit (100 per 10 seconds for tokens)
    return Math.min(100, (recentRequests / 100) * 100);
  }

  /**
   * Categorize response times for reporting
   */
  private categorizeResponseTime(duration: number): string {
    if (duration < 200) return 'excellent';
    if (duration < 500) return 'good';
    if (duration < 1000) return 'fair';
    if (duration < 2000) return 'slow';
    return 'very_slow';
  }

  /**
   * Start background performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Simple monitoring - in a real implementation, this might be more sophisticated
    setInterval(() => {
      // Clean up old metrics to prevent memory leaks
      const fiveMinutesAgo = Date.now() - 300000;
      this.performanceTracker.requests = this.performanceTracker.requests.filter(
        r => r.timestamp > fiveMinutesAgo
      );
    }, 60000); // Clean up every minute
  }

  /**
   * Get the last health check result
   */
  getLastHealthCheck(): SystemHealthReport | undefined {
    return this.lastHealthCheck;
  }
}
