# Field Presets for Trello MCP Server

This document describes the field presets feature that allows you to control how much data is returned from Trello API calls, optimizing for token usage and response speed.

## Overview

Field presets let you specify how much data you want returned from Trello queries. This is especially useful when using smaller/faster models like Haiku that have limited context windows.

## Available Presets

### `minimal`
Returns only the essential fields needed to identify resources.
- **Best for**: Fast searches, card lookups, listing resources
- **Use case**: When you just need IDs and names to locate items

### `standard` (default)
Returns commonly-used fields for most operations.
- **Best for**: General usage, displaying card details, typical workflows
- **Use case**: When you need more context but don't need everything

### `full`
Returns all available fields.
- **Best for**: Detailed analysis, exporting data, comprehensive reports
- **Use case**: When you need complete information about a resource

## Field Definitions by Resource Type

### Cards
| Preset | Fields |
|--------|--------|
| minimal | `id, name, idList, closed` |
| standard | `id, name, desc, idList, idLabels, due, dueComplete, closed, url, dateLastActivity` |
| full | All fields |

### Boards
| Preset | Fields |
|--------|--------|
| minimal | `id, name, closed` |
| standard | `id, name, desc, closed, idOrganization, url, shortUrl` |
| full | All fields |

### Lists
| Preset | Fields |
|--------|--------|
| minimal | `id, name, closed` |
| standard | `id, name, closed, idBoard, pos` |
| full | All fields |

### Members
| Preset | Fields |
|--------|--------|
| minimal | `id, username` |
| standard | `id, username, fullName, avatarUrl` |
| full | All fields |

### Labels
| Preset | Fields |
|--------|--------|
| minimal | `id, name, color` |
| standard | `id, name, color, idBoard` |
| full | All fields |

## Usage Examples

### Fast Card Search (Minimal)
```json
{
  "tool": "search_cards",
  "arguments": {
    "query": "login bug",
    "fields": "minimal",
    "limit": 5
  }
}
```

Response will only include `id`, `name`, `idList`, and `closed` for each card.

### Get Lists with Cards (Minimal)
```json
{
  "tool": "get_lists",
  "arguments": {
    "boardId": "abc123",
    "fields": "minimal",
    "includeCards": "open",
    "cardFields": "minimal"
  }
}
```

Returns minimal list data with minimal card data - great for getting an overview.

### Full Card Details
```json
{
  "tool": "get_card",
  "arguments": {
    "cardId": "xyz789",
    "fields": "full",
    "includeAttachments": true,
    "includeChecklists": true,
    "includeComments": true
  }
}
```

Returns everything about the card including all nested resources.

## Tools Supporting Field Presets

The following tools support the `fields` parameter:

| Tool | Default Preset | Notes |
|------|---------------|-------|
| `get_cards_by_list_id` | standard | Also supports `includeMembers`, `includeLabels` |
| `get_lists` | standard | Also supports `includeCards`, `cardFields` |
| `get_recent_activity` | standard | |
| `get_my_cards` | standard | |
| `list_boards` | standard | |
| `list_workspaces` | standard | |
| `list_boards_in_workspace` | standard | |
| `get_card` | full | Also supports `includeAttachments`, `includeChecklists`, `includeComments` |
| `get_board_members` | standard | |
| `get_board_labels` | standard | |
| `get_card_history` | standard | |
| `search_cards` | **minimal** | Optimized for fast searches |

## Best Practices

### For Haiku/Fast Models
1. Always use `fields: "minimal"` for search operations
2. Use `search_cards` instead of iterating through lists
3. Only fetch full details when you've identified the specific card(s) you need

### For Context Window Management
1. Start with `minimal` to find what you need
2. Then use `standard` or `full` on specific items
3. Avoid using `full` on list operations that return many items

### Example Workflow
```
1. search_cards(query: "feature request", fields: "minimal") -> Find card IDs
2. get_card(cardId: "found_id", fields: "standard") -> Get details you need
3. add_comment(cardId: "found_id", text: "...") -> Take action
```

## Custom Fields

You can also pass a custom comma-separated string of field names instead of a preset:

```json
{
  "tool": "get_cards_by_list_id",
  "arguments": {
    "listId": "abc123",
    "fields": "id,name,due,labels"
  }
}
```

Refer to the [Trello API documentation](https://developer.atlassian.com/cloud/trello/rest/) for available fields on each resource type.
