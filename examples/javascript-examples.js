/**
 * JavaScript Examples for MCP Server Trello
 *
 * These examples demonstrate how to use the MCP Server Trello
 * with JavaScript/Node.js applications.
 */

// Example 1: Basic Setup and Configuration
class TrelloMCPClient {
  constructor(serverName = 'trello') {
    this.serverName = serverName;
  }

  async callTool(toolName, args = {}) {
    // This would be replaced with your actual MCP client implementation
    return await use_mcp_tool({
      server_name: this.serverName,
      tool_name: toolName,
      arguments: args
    });
  }
}

// Example 2: Sprint Management System
class SprintManager {
  constructor(trelloClient) {
    this.trello = trelloClient;
    this.sprintNumber = null;
    this.sprintListId = null;
  }

  async initializeSprint(sprintNumber, startDate, endDate) {
    this.sprintNumber = sprintNumber;

    // Create sprint list
    const list = await this.trello.callTool('add_list_to_board', {
      name: `Sprint ${sprintNumber} (${startDate} - ${endDate})`
    });

    this.sprintListId = list.id;

    // Create sprint planning card
    const planningCard = await this.trello.callTool('add_card_to_list', {
      listId: this.sprintListId,
      name: `Sprint ${sprintNumber} Planning`,
      description: `# Sprint ${sprintNumber}\n\n**Duration**: ${startDate} to ${endDate}\n\n## Sprint Goals\n- [ ] Goal 1\n- [ ] Goal 2\n- [ ] Goal 3\n\n## Team Capacity\n- Dev: X points\n- QA: Y points`,
      dueDate: new Date(endDate).toISOString()
    });

    return { list, planningCard };
  }

  async addTaskToSprint(task) {
    const card = await this.trello.callTool('add_card_to_list', {
      listId: this.sprintListId,
      name: task.name,
      description: task.description,
      labels: task.labels || ['sprint-task'],
      dueDate: task.dueDate
    });

    // Add acceptance criteria
    if (task.acceptanceCriteria) {
      for (const criteria of task.acceptanceCriteria) {
        await this.trello.callTool('add_checklist_item', {
          text: criteria,
          checkListName: 'Acceptance Criteria'
        });
      }
    }

    return card;
  }

  async moveToInProgress(cardId) {
    const lists = await this.trello.callTool('get_lists', {});
    const inProgressList = lists.find(l => l.name === 'In Progress');

    if (inProgressList) {
      await this.trello.callTool('move_card', {
        cardId: cardId,
        listId: inProgressList.id
      });

      await this.trello.callTool('add_comment', {
        cardId: cardId,
        text: `Work started at ${new Date().toISOString()}`
      });
    }
  }

  async getSprintVelocity() {
    const cards = await this.trello.callTool('get_cards_by_list_id', {
      listId: this.sprintListId
    });

    let completed = 0;
    let total = cards.length;

    for (const card of cards) {
      const fullCard = await this.trello.callTool('get_card', {
        cardId: card.id
      });

      if (fullCard.dueComplete) {
        completed++;
      }
    }

    return {
      total,
      completed,
      velocity: (completed / total) * 100
    };
  }
}

// Example 3: Bug Tracking System
class BugTracker {
  constructor(trelloClient) {
    this.trello = trelloClient;
    this.bugListId = null;
  }

  async initialize() {
    const lists = await this.trello.callTool('get_lists', {});
    let bugList = lists.find(l => l.name === 'Bugs');

    if (!bugList) {
      bugList = await this.trello.callTool('add_list_to_board', {
        name: 'Bugs'
      });
    }

    this.bugListId = bugList.id;
  }

  async reportBug({
    title,
    description,
    severity = 'medium',
    environment = 'production',
    stepsToReproduce = [],
    expectedBehavior,
    actualBehavior,
    screenshotUrl,
    userId
  }) {
    // Determine priority based on severity
    const dueDateOffset = {
      'critical': 1,  // 1 day
      'high': 3,      // 3 days
      'medium': 7,    // 1 week
      'low': 14       // 2 weeks
    };

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (dueDateOffset[severity] || 7));

    // Create bug card
    const bugCard = await this.trello.callTool('add_card_to_list', {
      listId: this.bugListId,
      name: `🐛 [${severity.toUpperCase()}] ${title}`,
      description: this.formatBugDescription({
        description,
        environment,
        stepsToReproduce,
        expectedBehavior,
        actualBehavior,
        reportedBy: userId,
        reportedAt: new Date().toISOString()
      }),
      labels: ['bug', severity, environment],
      dueDate: dueDate.toISOString()
    });

    // Add QA checklist
    const qaChecklist = [
      'Bug is reproducible',
      'Root cause identified',
      'Fix implemented',
      'Unit tests added',
      'Integration tests passed',
      'Regression testing completed',
      'Fix verified in staging',
      'Documentation updated'
    ];

    for (const item of qaChecklist) {
      await this.trello.callTool('add_checklist_item', {
        text: item,
        checkListName: 'QA Checklist'
      });
    }

    // Attach screenshot if provided
    if (screenshotUrl) {
      await this.trello.callTool('attach_image_to_card', {
        cardId: bugCard.id,
        imageUrl: screenshotUrl,
        name: 'Bug Screenshot'
      });
    }

    return bugCard;
  }

  formatBugDescription({
    description,
    environment,
    stepsToReproduce,
    expectedBehavior,
    actualBehavior,
    reportedBy,
    reportedAt
  }) {
    return `## Bug Report

**Reported by**: ${reportedBy}
**Date**: ${reportedAt}
**Environment**: ${environment}

### Description
${description}

### Steps to Reproduce
${stepsToReproduce.map((step, i) => `${i + 1}. ${step}`).join('\n')}

### Expected Behavior
${expectedBehavior}

### Actual Behavior
${actualBehavior}

### Technical Details
- Browser: [To be filled]
- OS: [To be filled]
- Version: [To be filled]

### Impact
- Users affected: [To be estimated]
- Business impact: [To be assessed]`;
  }

  async updateBugStatus(cardId, status, notes) {
    const statusToList = {
      'triaged': 'Triaged',
      'in-progress': 'In Progress',
      'fixed': 'Fixed',
      'verified': 'Verified',
      'closed': 'Done'
    };

    // Get the appropriate list
    const lists = await this.trello.callTool('get_lists', {});
    const targetList = lists.find(l => l.name === statusToList[status]);

    if (targetList) {
      // Move card to new list
      await this.trello.callTool('move_card', {
        cardId: cardId,
        listId: targetList.id
      });

      // Add status update comment
      await this.trello.callTool('add_comment', {
        cardId: cardId,
        text: `**Status Update**: ${status}\n\n${notes}\n\nUpdated at: ${new Date().toISOString()}`
      });

      // Update labels
      const card = await this.trello.callTool('get_card', {
        cardId: cardId
      });

      const newLabels = card.labels.filter(l => !['triaged', 'in-progress', 'fixed', 'verified'].includes(l));
      newLabels.push(status);

      await this.trello.callTool('update_card_details', {
        cardId: cardId,
        labels: newLabels
      });
    }
  }

  async getBugMetrics() {
    const lists = await this.trello.callTool('get_lists', {});
    const metrics = {
      total: 0,
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      byStatus: {},
      overdue: []
    };

    for (const list of lists) {
      const cards = await this.trello.callTool('get_cards_by_list_id', {
        listId: list.id
      });

      const bugCards = cards.filter(card =>
        card.labels && card.labels.some(label => label === 'bug' || label.name === 'bug')
      );

      metrics.byStatus[list.name] = bugCards.length;
      metrics.total += bugCards.length;

      for (const card of bugCards) {
        // Count by severity
        for (const severity of ['critical', 'high', 'medium', 'low']) {
          if (card.labels.some(label => label === severity || label.name === severity)) {
            metrics.bySeverity[severity]++;
          }
        }

        // Check for overdue
        if (card.due && new Date(card.due) < new Date() && !card.dueComplete) {
          metrics.overdue.push({
            name: card.name,
            due: card.due,
            list: list.name
          });
        }
      }
    }

    return metrics;
  }
}

// Example 4: Release Management
class ReleaseManager {
  constructor(trelloClient) {
    this.trello = trelloClient;
  }

  async createRelease(version, targetDate, features = []) {
    // Create release card
    const releaseCard = await this.trello.callTool('add_card_to_list', {
      listId: 'releases-list-id', // You'd need to get this dynamically
      name: `Release v${version}`,
      description: this.formatReleaseNotes(version, targetDate, features),
      dueDate: new Date(targetDate).toISOString(),
      labels: ['release', 'milestone']
    });

    // Add release checklist
    const checklist = [
      'Code freeze announcement sent',
      'Feature freeze confirmed',
      'All PRs merged',
      'Build pipeline successful',
      'Automated tests passing',
      'Security scan completed',
      'Performance benchmarks met',
      'Documentation updated',
      'Release notes finalized',
      'Staging deployment successful',
      'UAT sign-off received',
      'Production deployment approved',
      'Deployment executed',
      'Smoke tests passed',
      'Monitoring alerts configured',
      'Rollback plan tested',
      'Stakeholders notified'
    ];

    for (const item of checklist) {
      await this.trello.callTool('add_checklist_item', {
        text: item,
        checkListName: 'Release Checklist'
      });
    }

    // Link feature cards
    for (const featureCardId of features) {
      await this.trello.callTool('add_comment', {
        cardId: featureCardId,
        text: `✅ Included in Release v${version}`
      });

      // Move to release column
      await this.trello.callTool('move_card', {
        cardId: featureCardId,
        listId: 'ready-for-release-list-id'
      });
    }

    return releaseCard;
  }

  formatReleaseNotes(version, targetDate, features) {
    return `# Release v${version}

**Target Date**: ${targetDate}
**Status**: Planning

## Release Summary
This release includes ${features.length} features and improvements.

## What's New
- Feature 1
- Feature 2
- Improvements

## Bug Fixes
- Fixed issue with...
- Resolved problem in...

## Breaking Changes
None

## Migration Guide
No migration required

## Rollback Plan
In case of critical issues:
1. Execute rollback script
2. Restore previous version
3. Notify stakeholders

## Deployment Schedule
- **Code Freeze**: [Date]
- **Staging Deployment**: [Date]
- **Production Deployment**: ${targetDate}

## Stakeholders
- Product: @product-team
- Engineering: @eng-team
- QA: @qa-team
- DevOps: @devops-team`;
  }

  async updateReleaseProgress(releaseCardId) {
    // Get checklist status
    const card = await this.trello.callTool('get_card', {
      cardId: releaseCardId
    });

    // Calculate progress
    let totalItems = 0;
    let completedItems = 0;

    if (card.checklists) {
      for (const checklist of card.checklists) {
        totalItems += checklist.checkItems.length;
        completedItems += checklist.checkItems.filter(item => item.state === 'complete').length;
      }
    }

    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    // Update card with progress
    await this.trello.callTool('add_comment', {
      cardId: releaseCardId,
      text: `📊 **Release Progress Update**\n\nProgress: ${progress.toFixed(1)}%\nCompleted: ${completedItems}/${totalItems} items\nUpdated: ${new Date().toISOString()}`
    });

    return { progress, completedItems, totalItems };
  }
}

// Example 5: Daily Standup Assistant
class StandupAssistant {
  constructor(trelloClient) {
    this.trello = trelloClient;
  }

  async generateStandupReport(userName) {
    // Get user's cards
    const myCards = await this.trello.callTool('get_my_cards', {});

    const report = {
      date: new Date().toLocaleDateString(),
      user: userName,
      yesterday: [],
      today: [],
      blockers: [],
      metrics: {
        cardsInProgress: 0,
        cardsCompleted: 0,
        overdueCards: 0
      }
    };

    // Get recent activity
    const recentActivity = await this.trello.callTool('get_recent_activity', {
      limit: 50
    });

    // Process cards
    for (const card of myCards) {
      const fullCard = await this.trello.callTool('get_card', {
        cardId: card.id
      });

      // Categorize by list
      if (fullCard.list.name === 'Done' || fullCard.list.name === 'Completed') {
        // Check if completed yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const completedYesterday = recentActivity.some(activity =>
          activity.data.card?.id === card.id &&
          activity.type === 'updateCard' &&
          new Date(activity.date) > yesterday
        );

        if (completedYesterday) {
          report.yesterday.push({
            name: card.name,
            url: card.url
          });
          report.metrics.cardsCompleted++;
        }
      } else if (fullCard.list.name === 'In Progress' || fullCard.list.name === 'Doing') {
        report.today.push({
          name: card.name,
          url: card.url,
          progress: this.getCardProgress(fullCard)
        });
        report.metrics.cardsInProgress++;
      } else if (fullCard.list.name === 'Blocked') {
        report.blockers.push({
          name: card.name,
          url: card.url,
          reason: this.getBlockerReason(fullCard)
        });
      }

      // Check for overdue
      if (card.due && new Date(card.due) < new Date() && !card.dueComplete) {
        report.metrics.overdueCards++;
      }
    }

    return this.formatStandupReport(report);
  }

  getCardProgress(card) {
    if (!card.checklists || card.checklists.length === 0) {
      return 'No checklist';
    }

    let total = 0;
    let completed = 0;

    for (const checklist of card.checklists) {
      total += checklist.checkItems.length;
      completed += checklist.checkItems.filter(item => item.state === 'complete').length;
    }

    return `${completed}/${total} items complete`;
  }

  getBlockerReason(card) {
    // Look for blocker reason in comments
    if (card.actions) {
      const recentComment = card.actions
        .filter(action => action.type === 'commentCard')
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      if (recentComment && recentComment.data.text.toLowerCase().includes('blocked')) {
        return recentComment.data.text;
      }
    }

    return 'No reason specified';
  }

  formatStandupReport(report) {
    return `# Daily Standup - ${report.user}
**Date**: ${report.date}

## 📅 Yesterday
${report.yesterday.length > 0 ?
  report.yesterday.map(task => `- ✅ ${task.name}`).join('\n') :
  '- No completed tasks'}

## 📋 Today
${report.today.length > 0 ?
  report.today.map(task => `- 🔄 ${task.name} (${task.progress})`).join('\n') :
  '- No tasks in progress'}

## 🚧 Blockers
${report.blockers.length > 0 ?
  report.blockers.map(blocker => `- ⛔ ${blocker.name}\n  - Reason: ${blocker.reason}`).join('\n') :
  '- No blockers'}

## 📊 Metrics
- Cards in Progress: ${report.metrics.cardsInProgress}
- Cards Completed Yesterday: ${report.metrics.cardsCompleted}
- Overdue Cards: ${report.metrics.overdueCards}`;
  }

  async postStandupToCard(report, standupCardId) {
    await this.trello.callTool('add_comment', {
      cardId: standupCardId,
      text: report
    });
  }
}

// Example Usage
async function main() {
  const trello = new TrelloMCPClient();

  // Initialize sprint management
  const sprintManager = new SprintManager(trello);
  await sprintManager.initializeSprint(23, '2025-01-22', '2025-02-05');

  // Add task to sprint
  await sprintManager.addTaskToSprint({
    name: 'Implement user authentication',
    description: 'Add OAuth 2.0 support',
    acceptanceCriteria: [
      'Users can login with Google',
      'Users can login with GitHub',
      'Session management works correctly'
    ],
    dueDate: '2025-01-30T17:00:00Z'
  });

  // Initialize bug tracker
  const bugTracker = new BugTracker(trello);
  await bugTracker.initialize();

  // Report a bug
  const bug = await bugTracker.reportBug({
    title: 'Login button not responding',
    description: 'The login button on the homepage does not respond to clicks',
    severity: 'high',
    environment: 'production',
    stepsToReproduce: [
      'Navigate to homepage',
      'Click on login button',
      'Nothing happens'
    ],
    expectedBehavior: 'Login modal should appear',
    actualBehavior: 'No response to click',
    screenshotUrl: 'https://example.com/screenshot.png',
    userId: 'john.doe@example.com'
  });

  // Generate standup report
  const standupAssistant = new StandupAssistant(trello);
  const standupReport = await standupAssistant.generateStandupReport('John Doe');
  console.log(standupReport);
}

// Export for use in other modules
module.exports = {
  TrelloMCPClient,
  SprintManager,
  BugTracker,
  ReleaseManager,
  StandupAssistant
};