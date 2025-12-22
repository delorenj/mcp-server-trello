import { z } from 'zod';
import { TrelloHealthMonitor, SystemHealthReport, HealthStatus } from './health-monitor.js';
import { TrelloClient } from '../trello-client.js';
import { getCacheManager } from '../cache-manager.js';

/**
 * Health endpoint result structure for MCP tools
 */
interface HealthEndpointResult {
  [x: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Repair operation result
 */
interface RepairResult {
  attempted: boolean;
  success: boolean;
  actions_taken: string[];
  message: string;
}

/**
 * THE MAGNIFICENT HEALTH ENDPOINTS COLLECTION! 🏥
 *
 * This class provides all the cardiovascular monitoring APIs that keep
 * our Trello MCP organism in peak condition. It's like having a team of
 * world-class physicians monitoring your API 24/7!
 *
 * Available endpoints:
 * - /health - Quick health check
 * - /health/detailed - Comprehensive diagnostic report
 * - /health/metadata - Metadata consistency verification
 * - /health/performance - Performance metrics analysis
 * - /admin/repair - Automated repair capabilities (when available)
 */
export class TrelloHealthEndpoints {
  private healthMonitor: TrelloHealthMonitor;
  private trelloClient: TrelloClient;

  constructor(trelloClient: TrelloClient) {
    this.trelloClient = trelloClient;
    this.healthMonitor = new TrelloHealthMonitor(trelloClient);
  }

  /**
   * GET /health
   * Quick health status check - the digital pulse check!
   * Perfect for load balancers and monitoring systems.
   */
  async getBasicHealth(): Promise<HealthEndpointResult> {
    try {
      const healthReport = await this.healthMonitor.getSystemHealth(false);

      const quickReport = {
        status: healthReport.overall_status,
        timestamp: healthReport.timestamp,
        uptime_ms: healthReport.uptime_ms,
        checks_passed: healthReport.checks.filter(c => c.status === HealthStatus.HEALTHY).length,
        total_checks: healthReport.checks.length,
        response_time_ms: Math.round(healthReport.performance_metrics.avg_response_time_ms),
        success_rate: `${healthReport.performance_metrics.success_rate_percent}%`,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(quickReport, null, 2),
          },
        ],
        isError: healthReport.overall_status === HealthStatus.CRITICAL,
      };
    } catch (error) {
      return this.createErrorResponse('Health check failed', error);
    }
  }

  /**
   * GET /health/detailed
   * Comprehensive health diagnostic - the full medical examination!
   * Includes all subsystem checks, performance metrics, and recommendations.
   */
  async getDetailedHealth(): Promise<HealthEndpointResult> {
    try {
      const healthReport = await this.healthMonitor.getSystemHealth(true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(healthReport, null, 2),
          },
        ],
        isError: healthReport.overall_status === HealthStatus.CRITICAL,
      };
    } catch (error) {
      return this.createErrorResponse('Detailed health check failed', error);
    }
  }

  /**
   * GET /health/metadata
   * Metadata consistency verification - the data integrity scanner!
   * Checks for consistency between boards, lists, cards, and checklists.
   */
  async getMetadataHealth(): Promise<HealthEndpointResult> {
    try {
      const startTime = Date.now();
      const metadataReport = await this.performMetadataConsistencyCheck();
      const duration = Date.now() - startTime;

      const result = {
        status: metadataReport.consistent ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        metadata_consistency: metadataReport,
        recommendations: this.generateMetadataRecommendations(metadataReport),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: !metadataReport.consistent,
      };
    } catch (error) {
      return this.createErrorResponse('Metadata health check failed', error);
    }
  }

  /**
   * GET /health/performance
   * Performance metrics analysis - the cardiovascular stress test!
   * Deep dive into response times, throughput, and system efficiency.
   */
  async getPerformanceHealth(): Promise<HealthEndpointResult> {
    try {
      const healthReport = await this.healthMonitor.getSystemHealth(false);
      const performanceAnalysis = this.analyzePerformanceMetrics(healthReport);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(performanceAnalysis, null, 2),
          },
        ],
        isError: performanceAnalysis.status === HealthStatus.CRITICAL,
      };
    } catch (error) {
      return this.createErrorResponse('Performance health check failed', error);
    }
  }

  /**
   * POST /admin/repair
   * Automated system repair - the digital emergency room!
   * Attempts to automatically fix common issues when possible.
   */
  async performRepair(): Promise<HealthEndpointResult> {
    try {
      const healthReport = await this.healthMonitor.getSystemHealth(true);

      if (!healthReport.repair_available) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  repair_attempted: false,
                  reason: 'No repairable issues detected or system in critical state',
                  status: healthReport.overall_status,
                  recommendations: healthReport.recommendations,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const repairResult = await this.attemptSystemRepair(healthReport);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(repairResult, null, 2),
          },
        ],
        isError: !repairResult.success,
      };
    } catch (error) {
      return this.createErrorResponse('System repair failed', error);
    }
  }

  /**
   * Perform comprehensive metadata consistency check
   */
  private async performMetadataConsistencyCheck() {
    const results = {
      consistent: true,
      issues: [] as string[],
      statistics: {} as Record<string, any>,
      last_check: new Date().toISOString(),
    };

    try {
      // Check if we have an active board
      const boardId = this.trelloClient.activeBoardId;
      if (!boardId) {
        results.consistent = false;
        results.issues.push('No active board configured');
        return results;
      }

      // Get board information
      const board = await this.trelloClient.getBoardById(boardId);
      if (board.closed) {
        results.consistent = false;
        results.issues.push('Active board is closed/archived');
      }

      // Get lists and check consistency
      const lists = await this.trelloClient.getLists();
      results.statistics.total_lists = lists.length;
      results.statistics.open_lists = lists.filter(l => !l.closed).length;
      results.statistics.closed_lists = lists.filter(l => l.closed).length;

      // Check for empty board
      if (lists.length === 0) {
        results.issues.push('Board has no lists');
      }

      // Get user cards for comparison
      const myCards = await this.trelloClient.getMyCards();
      results.statistics.total_user_cards = myCards.length;
      results.statistics.open_user_cards = myCards.filter(c => !c.closed).length;

      // Check workspace consistency
      const workspaceId = this.trelloClient.activeWorkspaceId;
      if (workspaceId) {
        try {
          const workspace = await this.trelloClient.getWorkspaceById(workspaceId);
          results.statistics.active_workspace = workspace.displayName;
        } catch (error) {
          results.consistent = false;
          results.issues.push('Active workspace is inaccessible');
        }
      }

      // Check checklist accessibility (non-critical)
      try {
        const acceptanceCriteria = await this.trelloClient.getAcceptanceCriteria();
        results.statistics.acceptance_criteria_items = acceptanceCriteria.length;
      } catch (error) {
        // This is not critical for consistency
        results.statistics.checklist_note =
          'Acceptance Criteria checklist not found (non-critical)';
      }
    } catch (error) {
      results.consistent = false;
      results.issues.push(
        `Metadata check error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    return results;
  }

  /**
   * Generate metadata-specific recommendations
   */
  private generateMetadataRecommendations(metadataReport: any): string[] {
    const recommendations: string[] = [];

    if (metadataReport.issues.some((issue: string) => issue.includes('No active board'))) {
      recommendations.push('Use set_active_board tool to configure an active board');
    }

    if (metadataReport.issues.some((issue: string) => issue.includes('closed/archived'))) {
      recommendations.push('Set a different active board that is not closed/archived');
    }

    if (metadataReport.issues.some((issue: string) => issue.includes('no lists'))) {
      recommendations.push('Create lists in your board using add_list_to_board tool');
    }

    if (metadataReport.statistics.total_user_cards === 0) {
      recommendations.push(
        'Consider assigning yourself to some cards for better workflow tracking'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Metadata consistency is excellent - no action required');
    }

    return recommendations;
  }

  /**
   * Analyze performance metrics in detail
   */
  private analyzePerformanceMetrics(healthReport: SystemHealthReport) {
    const metrics = healthReport.performance_metrics;
    const performanceGrade = this.calculatePerformanceGrade(metrics);

    // Get cache statistics
    const cacheManager = getCacheManager();
    const cacheStats = cacheManager.getStats();

    return {
      status: this.getPerformanceStatus(performanceGrade),
      timestamp: healthReport.timestamp,
      performance_grade: performanceGrade,
      metrics: {
        ...metrics,
        uptime_hours: Math.round((healthReport.uptime_ms / (1000 * 60 * 60)) * 100) / 100,
        health_check_duration_ms: healthReport.checks.reduce((sum, c) => sum + c.duration_ms, 0),
      },
      cache: {
        enabled: cacheManager.isEnabled(),
        store_type: cacheStats.storeType,
        connected: cacheStats.connected,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hit_rate_percent: Math.round(cacheStats.hitRate * 100),
        keys_cached: cacheStats.keys,
      },
      analysis: {
        response_time_rating: this.rateResponseTime(metrics.avg_response_time_ms),
        success_rate_rating: this.rateSuccessRate(metrics.success_rate_percent),
        throughput_rating: this.rateThroughput(metrics.requests_per_minute),
        rate_limit_health: this.rateRateLimitUtilization(metrics.rate_limit_utilization_percent),
        cache_efficiency: this.rateCacheEfficiency(cacheStats.hitRate * 100),
      },
      recommendations: this.generatePerformanceRecommendations(metrics, cacheStats),
    };
  }

  /**
   * Rate cache efficiency
   */
  private rateCacheEfficiency(hitRatePercent: number): string {
    if (hitRatePercent >= 80) return 'excellent';
    if (hitRatePercent >= 60) return 'good';
    if (hitRatePercent >= 40) return 'fair';
    if (hitRatePercent >= 20) return 'poor';
    return 'cold_cache';
  }

  /**
   * Calculate overall performance grade
   */
  private calculatePerformanceGrade(metrics: any): string {
    let score = 0;

    // Response time scoring (40% weight)
    if (metrics.avg_response_time_ms < 200) score += 40;
    else if (metrics.avg_response_time_ms < 500) score += 35;
    else if (metrics.avg_response_time_ms < 1000) score += 25;
    else if (metrics.avg_response_time_ms < 2000) score += 15;
    else score += 5;

    // Success rate scoring (35% weight)
    if (metrics.success_rate_percent >= 99) score += 35;
    else if (metrics.success_rate_percent >= 95) score += 30;
    else if (metrics.success_rate_percent >= 90) score += 20;
    else if (metrics.success_rate_percent >= 80) score += 10;
    else score += 5;

    // Rate limit utilization scoring (25% weight)
    if (metrics.rate_limit_utilization_percent < 50) score += 25;
    else if (metrics.rate_limit_utilization_percent < 70) score += 20;
    else if (metrics.rate_limit_utilization_percent < 85) score += 15;
    else if (metrics.rate_limit_utilization_percent < 95) score += 10;
    else score += 5;

    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }

  /**
   * Get performance status based on grade
   */
  private getPerformanceStatus(grade: string): HealthStatus {
    if (['A+', 'A', 'B'].includes(grade)) return HealthStatus.HEALTHY;
    if (['C', 'D'].includes(grade)) return HealthStatus.DEGRADED;
    return HealthStatus.CRITICAL;
  }

  /**
   * Rate individual performance aspects
   */
  private rateResponseTime(avgMs: number): string {
    if (avgMs < 200) return 'excellent';
    if (avgMs < 500) return 'good';
    if (avgMs < 1000) return 'fair';
    if (avgMs < 2000) return 'slow';
    return 'very_slow';
  }

  private rateSuccessRate(percent: number): string {
    if (percent >= 99) return 'excellent';
    if (percent >= 95) return 'good';
    if (percent >= 90) return 'fair';
    if (percent >= 80) return 'poor';
    return 'critical';
  }

  private rateThroughput(requestsPerMin: number): string {
    if (requestsPerMin > 30) return 'high';
    if (requestsPerMin > 15) return 'moderate';
    if (requestsPerMin > 5) return 'low';
    return 'very_low';
  }

  private rateRateLimitUtilization(percent: number): string {
    if (percent < 50) return 'optimal';
    if (percent < 70) return 'moderate';
    if (percent < 85) return 'high';
    if (percent < 95) return 'near_limit';
    return 'critical';
  }

  /**
   * Generate performance-specific recommendations
   */
  private generatePerformanceRecommendations(metrics: any, cacheStats?: any): string[] {
    const recommendations: string[] = [];

    if (metrics.avg_response_time_ms > 1000) {
      recommendations.push(
        'High response times detected - check network connectivity and Trello API status'
      );
    }

    if (metrics.success_rate_percent < 95) {
      recommendations.push(
        'Low success rate - investigate error patterns and implement retry logic'
      );
    }

    if (metrics.rate_limit_utilization_percent > 80) {
      recommendations.push(
        'High rate limit utilization - consider implementing request caching or batching'
      );
    }

    if (metrics.requests_per_minute < 1) {
      recommendations.push('Very low API usage - ensure the MCP server is being actively used');
    }

    // Cache-specific recommendations
    if (cacheStats) {
      const hitRate = cacheStats.hitRate * 100;
      if (hitRate < 20 && cacheStats.hits + cacheStats.misses > 10) {
        recommendations.push(
          'Low cache hit rate - cache may be cold or TTL values too short'
        );
      }
      if (!cacheStats.connected && cacheStats.storeType === 'valkey') {
        recommendations.push(
          'Valkey cache not connected - check TRELLO_VALKEY_URL configuration'
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is excellent - maintain current usage patterns');
    }

    return recommendations;
  }

  /**
   * Attempt to repair common system issues
   */
  private async attemptSystemRepair(healthReport: SystemHealthReport): Promise<RepairResult> {
    const result: RepairResult = {
      attempted: true,
      success: false,
      actions_taken: [],
      message: '',
    };

    try {
      // Check for repairable issues
      const boardCheck = healthReport.checks.find(c => c.name === 'board_access');

      if (
        boardCheck?.status === HealthStatus.DEGRADED &&
        boardCheck.message.includes('No active board configured')
      ) {
        // Attempt to set first available board as active
        const boards = await this.trelloClient.listBoards();
        const openBoards = boards.filter(b => !b.closed);

        if (openBoards.length > 0) {
          await this.trelloClient.setActiveBoard(openBoards[0].id);
          result.actions_taken.push(`Set active board to "${openBoards[0].name}"`);
        }
      }

      // Add more repair logic here as needed

      result.success = result.actions_taken.length > 0;
      result.message = result.success
        ? 'System repair completed successfully'
        : 'No repairable issues found';
    } catch (error) {
      result.success = false;
      result.message = `Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return result;
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(message: string, error: unknown): HealthEndpointResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: message,
              details: errorMessage,
              timestamp: new Date().toISOString(),
              status: HealthStatus.CRITICAL,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Zod schemas for health endpoint validation
 */
export const HealthEndpointSchemas = {
  basicHealth: {
    title: 'Get Basic Health',
    description: 'Get quick system health status for monitoring and load balancing',
    inputSchema: {},
  },

  detailedHealth: {
    title: 'Get Detailed Health',
    description: 'Get comprehensive system health diagnostic with all subsystem checks',
    inputSchema: {},
  },

  metadataHealth: {
    title: 'Get Metadata Health',
    description: 'Verify metadata consistency between boards, lists, cards, and checklists',
    inputSchema: {},
  },

  performanceHealth: {
    title: 'Get Performance Health',
    description: 'Get detailed performance metrics and analysis',
    inputSchema: {},
  },

  repair: {
    title: 'Perform System Repair',
    description: 'Attempt to automatically repair common system issues',
    inputSchema: {},
  },
};
