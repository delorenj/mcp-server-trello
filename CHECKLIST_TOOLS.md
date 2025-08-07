# Checklist Tools Documentation

The Trello MCP Server now includes comprehensive checklist management tools that allow you to interact with Trello checklists programmatically.

## Available Tools

### 1. `get_checklist_items`
Get all items from a checklist by name.

**Parameters:**
- `name` (string, required): Name of the checklist to retrieve items from
- `boardId` (string, optional): ID of the Trello board (uses default if not provided)

**Returns:** Array of `CheckListItem` objects

**Example:**
```json
{
  "name": "get_checklist_items",
  "arguments": {
    "name": "Development Tasks"
  }
}
```

### 2. `add_checklist_item`
Add a new item to a checklist.

**Parameters:**
- `text` (string, required): Text content of the checklist item
- `checkListName` (string, required): Name of the checklist to add the item to
- `boardId` (string, optional): ID of the Trello board (uses default if not provided)

**Returns:** The newly created `CheckListItem` object

**Example:**
```json
{
  "name": "add_checklist_item",
  "arguments": {
    "text": "Implement user authentication",
    "checkListName": "Development Tasks"
  }
}
```

### 3. `find_checklist_items_by_description`
Search for checklist items containing specific text in their description.

**Parameters:**
- `description` (string, required): Text to search for in checklist item descriptions
- `boardId` (string, optional): ID of the Trello board (uses default if not provided)

**Returns:** Array of matching `CheckListItem` objects

**Example:**
```json
{
  "name": "find_checklist_items_by_description",
  "arguments": {
    "description": "authentication"
  }
}
```

### 4. `get_acceptance_criteria`
Get all items from the "Acceptance Criteria" checklist. This is a convenience method that calls `get_checklist_items` with the name "Acceptance Criteria".

**Parameters:**
- `boardId` (string, optional): ID of the Trello board (uses default if not provided)

**Returns:** Array of `CheckListItem` objects from the "Acceptance Criteria" checklist

**Example:**
```json
{
  "name": "get_acceptance_criteria",
  "arguments": {}
}
```

### 5. `get_checklist_by_name`
Get a complete checklist with all its items and completion percentage.

**Parameters:**
- `name` (string, required): Name of the checklist to retrieve
- `boardId` (string, optional): ID of the Trello board (uses default if not provided)

**Returns:** A `CheckList` object with full details, or null if not found

**Example:**
```json
{
  "name": "get_checklist_by_name",
  "arguments": {
    "name": "Development Tasks"
  }
}
```

## Data Types

### CheckList
```typescript
interface CheckList {
  id: string;              // Unique identifier for the checklist
  name: string;            // Name of the checklist
  items: CheckListItem[];  // Array of all items in the checklist
  percentComplete: number; // Completion percentage (0-100)
}
```

### CheckListItem
```typescript
interface CheckListItem {
  id: string;              // Unique identifier for the checklist item
  text: string;            // Text content of the item
  complete: boolean;       // Whether the item is completed
  parentCheckListId: string; // ID of the parent checklist
}
```

## Usage Examples

### Getting Acceptance Criteria for a User Story
```javascript
// Get all acceptance criteria items
const acceptanceCriteria = await callTool('get_acceptance_criteria', {});

// Check completion status
acceptanceCriteria.forEach(item => {
  console.log(`${item.complete ? '✅' : '❌'} ${item.text}`);
});
```

### Adding a New Development Task
```javascript
// Add a new task to the development checklist
const newItem = await callTool('add_checklist_item', {
  text: 'Write unit tests for authentication module',
  checkListName: 'Development Tasks'
});

console.log(`Added new task: ${newItem.text}`);
```

### Finding All Security-Related Tasks
```javascript
// Search for security-related checklist items
const securityTasks = await callTool('find_checklist_items_by_description', {
  description: 'security'
});

console.log(`Found ${securityTasks.length} security-related tasks`);
```

### Getting Complete Checklist Status
```javascript
// Get full checklist with completion percentage
const checklist = await callTool('get_checklist_by_name', {
  name: 'Development Tasks'
});

if (checklist) {
  console.log(`${checklist.name}: ${checklist.percentComplete}% complete`);
  console.log(`${checklist.items.length} total items`);
} else {
  console.log('Checklist not found');
}
```

## Error Handling

All checklist tools include proper error handling and will return descriptive error messages for common scenarios:

- **No board ID provided and no active board set**: When no board context is available
- **Checklist not found**: When trying to add items to a non-existent checklist
- **API errors**: Network or authentication issues with the Trello API

## Integration with Existing Tools

The checklist tools work seamlessly with existing Trello MCP tools:

1. Use `set_active_board` to set the default board for checklist operations
2. Use `get_cards_by_list_id` to find cards that contain the checklists
3. Use `get_card` with `includeMarkdown: true` to see checklist items in formatted output

## Best Practices

1. **Set an active board** before using checklist tools to avoid having to specify `boardId` in every call
2. **Use consistent naming** for checklists across your Trello boards
3. **Search before adding** - use `find_checklist_items_by_description` to avoid duplicate items
4. **Monitor completion** - use `get_checklist_by_name` to track progress on important checklists