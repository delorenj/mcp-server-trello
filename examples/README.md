# MCP Server Trello - Examples

This directory contains comprehensive examples demonstrating how to use the MCP Server Trello in various scenarios and programming languages.

## 📚 Available Examples

### 1. [Usage Examples](./usage-examples.md)
Comprehensive guide with practical examples covering:
- Initial setup and configuration
- Board and workspace management
- Card management workflows
- List operations
- Checklist management
- Comments and collaboration
- File and image attachments
- Advanced workflows (Sprint planning, Daily standup, etc.)
- Real-world scenarios

### 2. [JavaScript Examples](./javascript-examples.js)
Node.js/JavaScript implementation examples featuring:
- Sprint Management System
- Bug Tracking System
- Release Management
- Daily Standup Assistant
- Complete working classes ready to use

### 3. [Python Examples](./python-examples.py)
Python implementation examples including:
- Task Priority System
- Kanban Board Automation
- Retrospective Management
- Project Analytics Dashboard
- Type-safe implementations with dataclasses

### 4. [TypeScript Examples](./typescript-examples.ts)
TypeScript examples with full type safety:
- Agile Board Manager
- Automation Rules Engine
- Time Tracking System
- Template System
- Complete type definitions and interfaces

## 🚀 Quick Start

### Prerequisites

1. **Set up MCP Server Trello**:
   ```bash
   npm install -g @delorenj/mcp-server-trello
   ```

2. **Configure your environment**:
   ```bash
   export TRELLO_API_KEY="your-api-key"
   export TRELLO_TOKEN="your-token"
   ```

3. **Get your Trello credentials**:
   - API Key: https://trello.com/app-key
   - Token: Generate using your API key

### Using the Examples

#### JavaScript/Node.js
```javascript
const { TrelloMCPClient, SprintManager } = require('./javascript-examples');

const client = new TrelloMCPClient();
const sprintManager = new SprintManager(client);

// Initialize a new sprint
await sprintManager.initializeSprint(23, '2025-01-22', '2025-02-05');
```

#### Python
```python
from python_examples import TrelloMCPClient, TaskManager, Priority, Task

client = TrelloMCPClient()
task_manager = TaskManager(client)

# Create a high-priority task
task = Task(
    name="Critical Bug Fix",
    description="Fix production issue",
    priority=Priority.CRITICAL
)
await task_manager.create_task(task)
```

#### TypeScript
```typescript
import { TrelloMCPClient, AgileBoard, UserStory } from './typescript-examples';

const client = new TrelloMCPClient();
const board = new AgileBoard(client);

// Create a user story
const story: UserStory = {
    title: 'New Feature',
    description: 'Implement new feature',
    acceptanceCriteria: ['AC1', 'AC2'],
    priority: 'high'
};
await board.createUserStory(story);
```

## 📖 Example Categories

### Project Management
- Sprint Planning and Management
- Agile Board Workflows
- Kanban Board Automation
- Release Management
- Retrospective Management

### Task Management
- Priority-based Task Systems
- Bug Tracking Workflows
- User Story Management
- Time Tracking
- Task Templates

### Automation
- Automation Rules Engine
- Workflow Automation
- Status Updates
- Notification Systems
- Card Movement Rules

### Analytics & Reporting
- Sprint Velocity Tracking
- Burndown Charts
- Project Health Metrics
- Team Performance Analytics
- Cycle Time Analysis

### Integration Examples
- AI Image Generation (with Ideogram)
- CI/CD Pipeline Integration
- GitHub Integration Patterns
- Slack Notifications
- Custom Webhook Handlers

## 🏗️ Architecture Patterns

### Client Wrapper Pattern
All examples use a client wrapper pattern for cleaner code:
```javascript
class TrelloMCPClient {
    async callTool(toolName, args) {
        // MCP tool invocation
    }
}
```

### Manager Classes
Organize functionality into logical manager classes:
- `SprintManager` - Sprint-specific operations
- `BugTracker` - Bug management workflows
- `ReleaseManager` - Release coordination
- `TaskManager` - General task operations

### Type Safety (TypeScript)
Full type definitions for all Trello entities:
```typescript
interface TrelloCard {
    id: string;
    name: string;
    // ... complete type definition
}
```

## 🔧 Common Patterns

### Error Handling
```javascript
try {
    const card = await client.addCardToList({...});
} catch (error) {
    if (error.message.includes('rate limit')) {
        // Handle rate limiting
    } else if (error.message.includes('unauthorized')) {
        // Handle auth errors
    }
}
```

### Batch Operations
```javascript
// Process multiple cards efficiently
const cards = await client.getCardsByListId(listId);
const updates = cards.map(card => updateCard(card));
await Promise.all(updates);
```

### Template Usage
```javascript
// Use templates for consistent card creation
const template = templateManager.getTemplate('bug-report');
const card = await templateManager.createFromTemplate(
    'bug-report',
    listId,
    customValues
);
```

## 🎯 Best Practices

1. **Always specify boardId** when working with multiple boards
2. **Use templates** for consistent card creation
3. **Implement retry logic** for rate limit handling
4. **Cache frequently accessed data** (lists, labels, etc.)
5. **Use batch operations** when possible
6. **Add meaningful comments** for collaboration
7. **Structure descriptions** with markdown
8. **Set appropriate due dates** based on priority
9. **Archive completed items** to keep boards clean
10. **Monitor API usage** to stay within limits

## 📊 Performance Considerations

- **Rate Limits**: 300 requests/10s per API key, 100 requests/10s per token
- **Batch Operations**: Group related operations to minimize API calls
- **Caching**: Cache board structure (lists, labels) to reduce lookups
- **Pagination**: Use limit parameters for large data sets
- **Async Operations**: Use Promise.all() for parallel operations

## 🔗 Related Resources

- [MCP Server Trello Documentation](../README.md)
- [Trello API Documentation](https://developer.atlassian.com/cloud/trello/rest/)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Trello Power-Ups](https://trello.com/power-ups)

## 💡 Contributing

Have a great example to share? Contributions are welcome! Please:
1. Follow the existing example structure
2. Include comprehensive comments
3. Provide error handling
4. Add to this README
5. Test your examples

## 📝 License

These examples are part of the MCP Server Trello project and are licensed under the MIT License.