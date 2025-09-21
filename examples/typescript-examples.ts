/**
 * TypeScript Examples for MCP Server Trello
 *
 * These examples demonstrate how to use the MCP Server Trello
 * with TypeScript applications, providing full type safety.
 */

// Types and Interfaces
// interface MCPToolCall {
//   server_name: string;
//   tool_name: string;
//   arguments?: Record<string, unknown>;
// }

interface TrelloCard {
  id: string;
  name: string;
  desc?: string;
  due?: string;
  dueComplete?: boolean;
  labels?: Label[];
  list?: TrelloList;
  url?: string;
  shortLink?: string;
  dateLastActivity?: string;
  checklists?: Checklist[];
}

interface TrelloList {
  id: string;
  name: string;
  closed?: boolean;
}

interface Label {
  id?: string;
  name: string;
  color?: string;
}

interface Checklist {
  id: string;
  name: string;
  checkItems: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  name: string;
  state: 'complete' | 'incomplete';
  due?: string | null;
}

interface Board {
  id: string;
  name: string;
  desc?: string;
  url?: string;
}

// interface Workspace {
//   id: string;
//   name: string;
//   displayName: string;
// }

// Example 1: Type-Safe Trello Client
class TrelloMCPClient {
  constructor(private serverName: string = 'trello') {}

  private async callTool<T = unknown>(
    toolName: string,
    args?: Record<string, unknown>
  ): Promise<T> {
    // This would be replaced with your actual MCP client implementation
    const response = await this.executeMCPCall({
      server_name: this.serverName,
      tool_name: toolName,
      arguments: args || {},
    });
    return response as T;
  }

  private async executeMCPCall(/* call: MCPToolCall */): Promise<unknown> {
    // Placeholder for actual MCP client call
    // In practice, you would use an MCP client library
    // console.log('MCP Call:', call);
    return {};
  }

  // Typed methods for each tool
  async getCard(cardId: string, includeMarkdown: boolean = false): Promise<TrelloCard> {
    return this.callTool<TrelloCard>('get_card', {
      cardId,
      includeMarkdown,
    });
  }

  async getLists(boardId?: string): Promise<TrelloList[]> {
    return this.callTool<TrelloList[]>('get_lists', { boardId });
  }

  async getCardsByListId(listId: string, boardId?: string): Promise<TrelloCard[]> {
    return this.callTool<TrelloCard[]>('get_cards_by_list_id', {
      listId,
      boardId,
    });
  }

  async addCardToList(params: {
    listId: string;
    name: string;
    description?: string;
    dueDate?: string;
    start?: string;
    labels?: string[];
    boardId?: string;
  }): Promise<TrelloCard> {
    return this.callTool<TrelloCard>('add_card_to_list', params);
  }

  async moveCard(cardId: string, listId: string, boardId?: string): Promise<TrelloCard> {
    return this.callTool<TrelloCard>('move_card', {
      cardId,
      listId,
      boardId,
    });
  }

  async updateCardDetails(params: {
    cardId: string;
    name?: string;
    description?: string;
    dueDate?: string;
    start?: string;
    dueComplete?: boolean;
    labels?: string[];
    boardId?: string;
  }): Promise<TrelloCard> {
    return this.callTool<TrelloCard>('update_card_details', params);
  }

  async addComment(cardId: string, text: string): Promise<unknown> {
    return this.callTool('add_comment', { cardId, text });
  }

  async attachImageToCard(params: {
    cardId: string;
    imageUrl: string;
    name?: string;
    boardId?: string;
  }): Promise<unknown> {
    return this.callTool('attach_image_to_card', params);
  }

  async listBoards(): Promise<Board[]> {
    return this.callTool<Board[]>('list_boards');
  }

  async setActiveBoard(boardId: string): Promise<Board> {
    return this.callTool<Board>('set_active_board', { boardId });
  }

  async getMyCards(): Promise<TrelloCard[]> {
    return this.callTool<TrelloCard[]>('get_my_cards');
  }

  async addChecklistItem(
    text: string,
    checkListName: string,
    boardId?: string
  ): Promise<ChecklistItem> {
    return this.callTool<ChecklistItem>('add_checklist_item', {
      text,
      checkListName,
      boardId,
    });
  }

  async getChecklistByName(name: string, boardId?: string): Promise<Checklist | null> {
    return this.callTool<Checklist | null>('get_checklist_by_name', {
      name,
      boardId,
    });
  }
}

// Example 2: Agile Board Manager with Full Type Safety
enum AgileListType {
  BACKLOG = 'Backlog',
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  REVIEW = 'Code Review',
  TESTING = 'Testing',
  DONE = 'Done',
}

interface StoryPoint {
  value: number;
  confidence: 'low' | 'medium' | 'high';
}

interface UserStory {
  id?: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  storyPoints?: StoryPoint;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  epic?: string;
  sprint?: number;
}

class AgileBoard {
  private listIds: Map<AgileListType, string> = new Map();

  constructor(private client: TrelloMCPClient) {}

  async initialize(): Promise<void> {
    const lists = await this.client.getLists();

    for (const listType of Object.values(AgileListType)) {
      const list = lists.find(l => l.name === listType);
      if (list) {
        this.listIds.set(listType, list.id);
      }
    }
  }

  async createUserStory(story: UserStory): Promise<TrelloCard> {
    const listId = this.listIds.get(AgileListType.BACKLOG);
    if (!listId) {
      throw new Error('Backlog list not found');
    }

    // const storyPointsLabel = story.storyPoints ? `SP:${story.storyPoints.value}` : undefined;

    const card = await this.client.addCardToList({
      listId,
      name: this.formatStoryTitle(story),
      description: this.formatStoryDescription(story),
      labels: this.getStoryLabels(story),
    });

    // Add acceptance criteria as checklist
    for (const criterion of story.acceptanceCriteria) {
      await this.client.addChecklistItem(criterion, 'Acceptance Criteria');
    }

    return card;
  }

  private formatStoryTitle(story: UserStory): string {
    const points = story.storyPoints ? `[${story.storyPoints.value}] ` : '';
    const epic = story.epic ? `{${story.epic}} ` : '';
    return `${points}${epic}${story.title}`;
  }

  private formatStoryDescription(story: UserStory): string {
    return `# User Story

## Description
${story.description}

## Story Points
- **Value**: ${story.storyPoints?.value || 'Not estimated'}
- **Confidence**: ${story.storyPoints?.confidence || 'N/A'}

## Priority
${story.priority.toUpperCase()}

## Epic
${story.epic || 'None'}

## Sprint
${story.sprint ? `Sprint ${story.sprint}` : 'Not assigned'}

## Assignee
${story.assignee || 'Unassigned'}

## Definition of Done
- [ ] Code complete
- [ ] Unit tests written and passing
- [ ] Code reviewed
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA approved
`;
  }

  private getStoryLabels(story: UserStory): string[] {
    const labels: string[] = [story.priority];

    if (story.epic) {
      labels.push(`epic:${story.epic}`);
    }

    if (story.sprint) {
      labels.push(`sprint-${story.sprint}`);
    }

    if (story.storyPoints) {
      labels.push(`${story.storyPoints.value}sp`);
    }

    return labels;
  }

  async moveStoryToSprint(storyId: string, sprintNumber: number): Promise<void> {
    const todoListId = this.listIds.get(AgileListType.TODO);
    if (!todoListId) {
      throw new Error('To Do list not found');
    }

    await this.client.moveCard(storyId, todoListId);

    const card = await this.client.getCard(storyId);
    const newLabels = card.labels
      ? card.labels.filter(l => !l.name.startsWith('sprint-')).map(l => l.name)
      : [];
    newLabels.push(`sprint-${sprintNumber}`);

    await this.client.updateCardDetails({
      cardId: storyId,
      labels: newLabels,
    });

    await this.client.addComment(
      storyId,
      `📋 Added to Sprint ${sprintNumber}\nDate: ${new Date().toISOString()}`
    );
  }

  async calculateSprintVelocity(sprintNumber: number): Promise<{
    planned: number;
    completed: number;
    percentage: number;
  }> {
    const doneListId = this.listIds.get(AgileListType.DONE);
    if (!doneListId) {
      throw new Error('Done list not found');
    }

    const cards = await this.client.getCardsByListId(doneListId);
    const sprintCards = cards.filter(card =>
      card.labels?.some(l => l.name === `sprint-${sprintNumber}`)
    );

    let planned = 0;
    let completed = 0;

    for (const card of sprintCards) {
      const pointsMatch = card.name.match(/\[(\d+)\]/);
      if (pointsMatch) {
        const points = parseInt(pointsMatch[1], 10);
        planned += points;
        if (card.dueComplete) {
          completed += points;
        }
      }
    }

    return {
      planned,
      completed,
      percentage: planned > 0 ? (completed / planned) * 100 : 0,
    };
  }
}

// Example 3: Automation Rules Engine
interface AutomationRule {
  id: string;
  name: string;
  trigger: TriggerType;
  conditions: Condition[];
  actions: Action[];
  enabled: boolean;
}

enum TriggerType {
  CARD_CREATED = 'card_created',
  CARD_MOVED = 'card_moved',
  DUE_DATE_APPROACHING = 'due_date_approaching',
  CHECKLIST_COMPLETE = 'checklist_complete',
  LABEL_ADDED = 'label_added',
}

interface Condition {
  type: 'list' | 'label' | 'due_date' | 'assignee';
  operator: 'equals' | 'contains' | 'before' | 'after';
  value: string;
}

interface Action {
  type: 'move' | 'add_label' | 'remove_label' | 'add_comment' | 'assign' | 'archive';
  value: string;
}

class AutomationEngine {
  private rules: AutomationRule[] = [];

  constructor(private client: TrelloMCPClient) {}

  addRule(rule: AutomationRule): void {
    this.rules.push(rule);
  }

  async processCard(card: TrelloCard, trigger: TriggerType): Promise<void> {
    const applicableRules = this.rules.filter(rule => rule.enabled && rule.trigger === trigger);

    for (const rule of applicableRules) {
      if (await this.evaluateConditions(card, rule.conditions)) {
        await this.executeActions(card, rule.actions);
      }
    }
  }

  private async evaluateConditions(card: TrelloCard, conditions: Condition[]): Promise<boolean> {
    for (const condition of conditions) {
      if (!(await this.evaluateCondition(card, condition))) {
        return false;
      }
    }
    return true;
  }

  private async evaluateCondition(card: TrelloCard, condition: Condition): Promise<boolean> {
    switch (condition.type) {
      case 'list':
        return condition.operator === 'equals' && card.list?.name === condition.value;

      case 'label':
        return (
          condition.operator === 'contains' &&
          (card.labels?.some(l => l.name === condition.value) ?? false)
        );

      case 'due_date': {
        if (!card.due) return false;
        const dueDate = new Date(card.due);
        const compareDate = new Date(condition.value);
        return condition.operator === 'before' ? dueDate < compareDate : dueDate > compareDate;
      }

      default:
        return false;
    }
  }

  private async executeActions(card: TrelloCard, actions: Action[]): Promise<void> {
    for (const action of actions) {
      await this.executeAction(card, action);
    }
  }

  private async executeAction(card: TrelloCard, action: Action): Promise<void> {
    switch (action.type) {
      case 'move': {
        const lists = await this.client.getLists();
        const targetList = lists.find(l => l.name === action.value);
        if (targetList) {
          await this.client.moveCard(card.id, targetList.id);
        }
        break;
      }

      case 'add_label': {
        const currentLabels = card.labels?.map(l => l.name) || [];
        if (!currentLabels.includes(action.value)) {
          currentLabels.push(action.value);
          await this.client.updateCardDetails({
            cardId: card.id,
            labels: currentLabels,
          });
        }
        break;
      }

      case 'add_comment':
        await this.client.addComment(card.id, action.value);
        break;

      default:
      // console.warn(`Unhandled action type: ${action.type}`);
    }
  }
}

// Example 4: Time Tracking System
interface TimeEntry {
  cardId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  description: string;
}

class TimeTracker {
  private activeEntries: Map<string, TimeEntry> = new Map();

  constructor(private client: TrelloMCPClient) {}

  async startTimer(cardId: string, userId: string, description: string = ''): Promise<void> {
    const key = `${userId}-${cardId}`;

    if (this.activeEntries.has(key)) {
      throw new Error('Timer already running for this card');
    }

    const entry: TimeEntry = {
      cardId,
      userId,
      startTime: new Date(),
      description,
    };

    this.activeEntries.set(key, entry);

    await this.client.addComment(
      cardId,
      `⏱️ **Timer Started**\nUser: ${userId}\nTime: ${entry.startTime.toISOString()}`
    );

    // Move card to "In Progress" if not already there
    await this.moveToInProgress(cardId);
  }

  async stopTimer(cardId: string, userId: string): Promise<TimeEntry> {
    const key = `${userId}-${cardId}`;
    const entry = this.activeEntries.get(key);

    if (!entry) {
      throw new Error('No active timer for this card');
    }

    entry.endTime = new Date();
    entry.duration = Math.floor((entry.endTime.getTime() - entry.startTime.getTime()) / 60000);

    this.activeEntries.delete(key);

    await this.logTimeEntry(entry);

    return entry;
  }

  private async logTimeEntry(entry: TimeEntry): Promise<void> {
    const hours = Math.floor((entry.duration || 0) / 60);
    const minutes = (entry.duration || 0) % 60;

    const timeSpent = `${hours}h ${minutes}m`;

    await this.client.addComment(
      entry.cardId,
      `⏱️ **Time Logged**
User: ${entry.userId}
Duration: ${timeSpent}
Start: ${entry.startTime.toISOString()}
End: ${entry.endTime?.toISOString()}
${entry.description ? `\nNotes: ${entry.description}` : ''}`
    );

    // Update card with total time spent
    await this.updateTotalTime(entry.cardId, entry.duration || 0);
  }

  private async updateTotalTime(cardId: string, additionalMinutes: number): Promise<void> {
    const card = await this.client.getCard(cardId);

    // Extract current total from card description or name
    const currentTotalMatch = card.desc?.match(/Total Time: (\d+)h (\d+)m/);
    let totalMinutes = additionalMinutes;

    if (currentTotalMatch) {
      const currentHours = parseInt(currentTotalMatch[1], 10);
      const currentMinutes = parseInt(currentTotalMatch[2], 10);
      totalMinutes += currentHours * 60 + currentMinutes;
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    const updatedDesc = card.desc
      ? card.desc.replace(
          /Total Time: \d+h \d+m/,
          `Total Time: ${totalHours}h ${remainingMinutes}m`
        )
      : `Total Time: ${totalHours}h ${remainingMinutes}m`;

    await this.client.updateCardDetails({
      cardId,
      description: updatedDesc,
    });
  }

  private async moveToInProgress(cardId: string): Promise<void> {
    const lists = await this.client.getLists();
    const inProgressList = lists.find(l => l.name.toLowerCase().includes('progress'));

    if (inProgressList) {
      await this.client.moveCard(cardId, inProgressList.id);
    }
  }

  async getTimeReport() /* startDate: Date, */
  /* endDate: Date */
  : Promise<{
    totalHours: number;
    byCard: Map<string, number>;
    byUser: Map<string, number>;
  }> {
    // This would typically query a database of logged time entries
    // For this example, we'll parse comments to extract time logs

    const report = {
      totalHours: 0,
      byCard: new Map<string, number>(),
      byUser: new Map<string, number>(),
    };

    // In a real implementation, you would store time entries in a database
    // and query them here based on the date range

    return report;
  }
}

// Example 5: Template System
interface CardTemplate {
  name: string;
  description: string;
  labels: string[];
  checklistItems: Map<string, string[]>;
  customFields?: Record<string, unknown>;
}

class TemplateManager {
  private templates: Map<string, CardTemplate> = new Map();

  constructor(private client: TrelloMCPClient) {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Bug Report Template
    this.templates.set('bug-report', {
      name: '[BUG] Issue Title',
      description: `## Bug Report

### Environment
- **Browser/OS**:
- **Version**:
- **User**:

### Description


### Steps to Reproduce
1.
2.
3.

### Expected Behavior


### Actual Behavior


### Screenshots/Logs
`,
      labels: ['bug', 'triage-needed'],
      checklistItems: new Map([
        ['Bug Verification', ['Bug reproduced', 'Root cause identified', 'Solution proposed']],
        [
          'Fix Implementation',
          ['Fix implemented', 'Unit tests added', 'Code reviewed', 'Integration tests passing'],
        ],
      ]),
    });

    // Feature Request Template
    this.templates.set('feature-request', {
      name: '[FEATURE] Request Title',
      description: `## Feature Request

### Summary


### Business Value


### User Story
As a [type of user]
I want [functionality]
So that [benefit]

### Acceptance Criteria
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

### Technical Considerations


### Dependencies

`,
      labels: ['feature', 'needs-review'],
      checklistItems: new Map([
        ['Planning', ['Requirements gathered', 'Design approved', 'Technical approach defined']],
        ['Implementation', ['Development complete', 'Tests written', 'Documentation updated']],
        [
          'Release',
          ['Code reviewed', 'QA tested', 'Deployed to staging', 'User acceptance testing complete'],
        ],
      ]),
    });

    // Release Template
    this.templates.set('release', {
      name: 'Release v0.0.0',
      description: `## Release Checklist

### Pre-release
- [ ] Code freeze announced
- [ ] All features merged
- [ ] Tests passing
- [ ] Documentation updated

### Release
- [ ] Version bumped
- [ ] Release notes created
- [ ] Tagged in git
- [ ] Deployed to production

### Post-release
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified
- [ ] Retrospective scheduled
`,
      labels: ['release', 'milestone'],
      checklistItems: new Map([
        [
          'Pre-release',
          ['Code freeze', 'Feature complete', 'Bug fixes merged', 'Release branch created'],
        ],
        [
          'Testing',
          [
            'Unit tests passing',
            'Integration tests passing',
            'E2E tests passing',
            'Performance tests passing',
          ],
        ],
        [
          'Deployment',
          [
            'Staging deployment',
            'Smoke tests',
            'Production deployment',
            'Post-deployment verification',
          ],
        ],
      ]),
    });
  }

  async createFromTemplate(
    templateName: string,
    listId: string,
    customValues?: Partial<CardTemplate>
  ): Promise<TrelloCard> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Merge template with custom values
    const finalTemplate = { ...template, ...customValues };

    // Create the card
    const card = await this.client.addCardToList({
      listId,
      name: finalTemplate.name,
      description: finalTemplate.description,
      labels: finalTemplate.labels,
    });

    // Add checklists
    for (const [checklistName, items] of finalTemplate.checklistItems.entries()) {
      for (const item of items) {
        await this.client.addChecklistItem(item, checklistName);
      }
    }

    return card;
  }

  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  getTemplateDetails(templateName: string): CardTemplate | undefined {
    return this.templates.get(templateName);
  }
}

// Example Usage
/* async function demonstrateUsage(): Promise<void> {
  const client = new TrelloMCPClient();

  // 1. Agile Board Usage
  const agileBoard = new AgileBoard(client);
  await agileBoard.initialize();

  const story: UserStory = {
    title: 'Implement user authentication',
    description: 'Add OAuth 2.0 authentication for user login',
    acceptanceCriteria: [
      'Users can login with Google',
      'Users can login with GitHub',
      'Session persists across browser restart',
      'Logout functionality works',
    ],
    storyPoints: { value: 8, confidence: 'high' },
    priority: 'high',
    epic: 'Authentication',
    sprint: 23,
  };

  const storyCard = await agileBoard.createUserStory(story);
  // console.log(`Created story: ${storyCard.id}`);

  // 2. Automation Rules
  const automation = new AutomationEngine(client);

  // Add rule: Move high-priority bugs to "In Progress" when created
  automation.addRule({
    id: 'auto-1',
    name: 'Auto-prioritize high bugs',
    trigger: TriggerType.CARD_CREATED,
    conditions: [
      { type: 'label', operator: 'contains', value: 'bug' },
      { type: 'label', operator: 'contains', value: 'high' },
    ],
    actions: [
      { type: 'move', value: 'In Progress' },
      { type: 'add_comment', value: '🚨 High priority bug auto-assigned' },
    ],
    enabled: true,
  });

  // 3. Time Tracking
  const timeTracker = new TimeTracker(client);
  await timeTracker.startTimer(
    storyCard.id,
    'developer@example.com',
    'Working on OAuth implementation'
  );

  // Simulate work...
  await new Promise(resolve => setTimeout(resolve, 1000));

  const timeEntry = await timeTracker.stopTimer(storyCard.id, 'developer@example.com');
  // console.log(`Time logged: ${timeEntry.duration} minutes`);

  // 4. Template Usage
  const templateManager = new TemplateManager(client);
  const lists = await client.getLists();
  const backlogList = lists.find(l => l.name === 'Backlog');

  if (backlogList) {
    const bugCard = await templateManager.createFromTemplate('bug-report', backlogList.id, {
      name: '[BUG] Login button not working',
      labels: ['bug', 'critical', 'production'],
    });
    // console.log(`Created bug from template: ${bugCard.id}`);
  }

  // 5. Sprint Velocity
  const velocity = await agileBoard.calculateSprintVelocity(23);
  // console.log(
  //   `Sprint 23 Velocity: ${velocity.completed}/${velocity.planned} points (${velocity.percentage.toFixed(1)}%)`
  // );
} */

// Run the examples
/* if (require.main === module) {
  demonstrateUsage()
    .then(() => console.log('Examples completed successfully'))
    .catch(error => console.error('Error running examples:', error));
} */

// Export for use in other modules
export {
  TrelloMCPClient,
  AgileBoard,
  AutomationEngine,
  TimeTracker,
  TemplateManager,
  UserStory,
  AgileListType,
  TriggerType,
  CardTemplate,
  TimeEntry,
};
