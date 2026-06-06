# MCP Server Trello

[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/27359682-7632-4ba7-981d-7dfecadf1c4b)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io/servers/io.github.delorenj/mcp-server-trello)
[![npm version](https://badge.fury.io/js/%40delorenj%2Fmcp-server-trello.svg)](https://badge.fury.io/js/%40delorenj%2Fmcp-server-trello)

<a href="https://glama.ai/mcp/servers/klqkamy7wt"><img width="380" height="200" src="https://glama.ai/mcp/servers/klqkamy7wt/badge" alt="Server Trello MCP server" /></a>

A Model Context Protocol (MCP) server that provides tools for interacting with Trello boards. This server enables seamless integration with Trello's API while handling rate limiting, type safety, and error handling automatically.

## 🎉 New in v1.5.0: Now Powered by Bun! ⚡

**This project is now powered by Bun!** 🚀 We've migrated the entire project to the Bun runtime, resulting in a 2.8-4.4x performance boost. All existing `npx`, `pnpx`, and `npm` commands will **continue to work perfectly**.

### ✨ New in This Release:

  - 🚀 **Performance Boost**: Enjoy a faster, more responsive server.
  - **Bun-Powered**: The project now runs on the lightning-fast Bun runtime.
  - 📖 **Comprehensive Examples**: A new `examples` directory with detailed implementations in JavaScript, Python, and TypeScript.

**Plus:** Modern MCP SDK architecture, enhanced type safety, and comprehensive documentation!

## Changelog

For a detailed list of changes, please refer to the [CHANGELOG.md](CHANGELOG.md) file.

## Features

  - **Full Trello Board Integration**: Interact with cards, lists, and board activities
  - **🆕 Complete Card Data Extraction**: Fetch all card details including checklists, attachments, labels, members, and comments
  - **💬 Comment Management**: Add, update, delete, and retrieve comments on cards
  - **File Attachments**: Attach any type of file to cards (PDFs, documents, videos, images, etc.) from URLs
  - **Built-in Rate Limiting**: Respects Trello's API limits (300 requests/10s per API key, 100 requests/10s per token)
  - **Type-Safe Implementation**: Written in TypeScript with comprehensive type definitions
  - **Input Validation**: Robust validation for all API inputs
  - **Error Handling**: Graceful error handling with informative messages
  - **Dynamic Board Selection**: Switch between boards and workspaces without restarting
  - **Markdown Formatting**: Export card data in human-readable markdown format

## Installation

This repository is distributed as a **BMAD-compatible skill package** for the
Trello MCP server. Install the `skill/` directory through your agent's skill
management workflow, or place it in the agent's skills directory.

When an agent activates the skill, it follows `skill/SKILL.md`. On first use,
the agent runs the bundled installer:

```bash
bash skill/scripts/install.sh
```

The installer builds the MCP server from `skill/assets/source/` when Bun is
available. If Bun is unavailable, it falls back to the published Smithery
install path for `@delorenj/mcp-server-trello` and creates the same local
`build/index.js` command path used by the skill activation check.

## Skill package structure

The skill is the agent-facing entry point for this repository.

- `skill/SKILL.md`: Activation, routing, and agent workflow rules.
- `skill/scripts/install.sh`: First-run installer for the bundled server.
- `skill/references/trello-mcp/`: Focused references for setup, tools,
  workflows, and gotchas.
- `skill/assets/source/`: Bundled MCP server source used for local builds.

For AI agents, start with `skill/SKILL.md` rather than this README. The README
is the human-facing overview; the skill references are the operational surface
for tool selection and Trello workflow rules.

Maintainers can refresh the bundled source before packaging with:

```bash
mise run package
```

## Configuration

### Environment Variables

The server can be configured using environment variables. Create a `.env` file in the root directory with the following variables:

```env
# Required: Your Trello API credentials
TRELLO_API_KEY=your-api-key
TRELLO_TOKEN=your-token

# Optional (Deprecated): Default board ID (can be changed later using set_active_board)
TRELLO_BOARD_ID=your-board-id

# Optional: Initial workspace ID (can be changed later using set_active_workspace)
TRELLO_WORKSPACE_ID=your-workspace-id

# Optional: HTTPS proxy URL (for corporate proxies or restricted networks)
https_proxy=http://your-proxy:8080

# Optional: Restrict access to specific workspaces (comma-separated IDs)
# If set, only the listed workspaces will be accessible via MCP tools
TRELLO_ALLOWED_WORKSPACES=workspace-id-1,workspace-id-2
```

> **Proxy Support:** If you're behind a corporate proxy or in an environment that routes traffic through a proxy, set the `https_proxy` or `HTTPS_PROXY` environment variable. The server will automatically route all Trello API requests through the specified proxy.

You can get these values from:

  - API Key: [https://trello.com/app-key](https://trello.com/app-key)
  - Token: Generate using your API key
  - Board ID (optional, deprecated): Found in the board URL (e.g., `https://trello.com/b/abc123/example-board`)
  - Workspace ID: Found in workspace settings or using `list_workspaces` tool

### Board and Workspace Management

Starting with version 0.3.0, the MCP server supports multiple ways to work with boards:

1.  **Multi-board support**: All methods now accept an optional `boardId` parameter
       - Omit `TRELLO_BOARD_ID` and provide `boardId` in each API call
       - Set `TRELLO_BOARD_ID` as default and optionally override with `boardId` parameter

2.  **Dynamic board selection**: Use workspace management tools
       - The `TRELLO_BOARD_ID` in your `.env` file is used as the initial/default board ID
       - You can change the active board at any time using the `set_active_board` tool
       - The selected board persists between server restarts (stored in `~/.trello-mcp/config.json`)
       - Similarly, you can set and persist an active workspace using `set_active_workspace`

This allows you to work with multiple boards and workspaces without restarting the server.

### Workspace Access Restriction

You can optionally restrict MCP access to specific workspaces using the `TRELLO_ALLOWED_WORKSPACES` environment variable. This is useful for:

- **Security**: Limiting AI agent access to only approved workspaces
- **Multi-tenant setups**: Ensuring agents only access relevant workspaces
- **Testing**: Isolating test environments from production data

When `TRELLO_ALLOWED_WORKSPACES` is set:
- `list_workspaces` only returns workspaces in the allowed list
- `list_boards` only returns boards from allowed workspaces
- `set_active_workspace` rejects workspaces not in the allowed list
- `list_boards_in_workspace` rejects non-allowed workspace IDs
- `create_board` rejects creation in non-allowed workspaces

Example configuration:
```bash
# Only allow access to two specific workspaces
TRELLO_ALLOWED_WORKSPACES=697c549ce04dc460af133a75,5f8a3b2c1d4e5f6a7b8c9d0e
```

If `TRELLO_ALLOWED_WORKSPACES` is not set or empty, all workspaces the token has access to will be available (default behaviour).

#### Example Workflow

1.  Start by listing available boards:

<!-- end list -->

```typescript
{
  name: 'list_boards',
  arguments: {}
}
```

2.  Set your active board:

<!-- end list -->

```typescript
{
  name: 'set_active_board',
  arguments: {
    boardId: "abc123"  // ID from list_boards response
  }
}
```

3.  List workspaces if needed:

<!-- end list -->

```typescript
{
  name: 'list_workspaces',
  arguments: {}
}
```

4.  Set active workspace if needed:

<!-- end list -->

```typescript
{
  name: 'set_active_workspace',
  arguments: {
    workspaceId: "xyz789"  // ID from list_workspaces response
  }
}
```

5.  Check current active board info:

<!-- end list -->

```typescript
{
  name: 'get_active_board_info',
  arguments: {}
}
```

## Date Format Guidelines

When working with dates in the Trello MCP server, please note the different format requirements:

  - **Due Date (`dueDate`)**: Accepts full ISO 8601 format with time (e.g., `2023-12-31T12:00:00Z`)
  - **Start Date (`start`)**: Accepts date only in YYYY-MM-DD format (e.g., `2025-08-05`)

This distinction follows Trello's API conventions where start dates are day-based markers while due dates can include specific times.

## Available Tools

### Checklist Management Tools 🆕

#### get\_checklist\_items

Get all items from a checklist by name.

```typescript
{
  name: 'get_checklist_items',
  arguments: {
    name: string,        // Name of the checklist to retrieve items from
    boardId?: string     // Optional: ID of the board (uses default if not provided)
  }
}
```

#### add\_checklist\_item

Add a new item to an existing checklist.

```typescript
{
  name: 'add_checklist_item',
  arguments: {
    text: string,           // Text content of the checklist item
    checkListName: string,  // Name of the checklist to add the item to
    boardId?: string        // Optional: ID of the board (uses default if not provided)
  }
}
```

#### find\_checklist\_items\_by\_description

Search for checklist items containing specific text.

```typescript
{
nbsp; name: 'find_checklist_items_by_description',
  arguments: {
    description: string,  // Text to search for in checklist item descriptions
    boardId?: string      // Optional: ID of the board (uses default if not provided)
nbsp; }
}
```

#### get\_acceptance\_criteria

Get all items from the "Acceptance Criteria" checklist.

```typescript
{
  name: 'get_acceptance_criteria',
  arguments: {
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

#### get\_checklist\_by\_name

Get a complete checklist with all items and completion percentage.

```typescript
{
  name: 'get_checklist_by_name',
  arguments: {
    name: string,     // Name of the checklist to retrieve
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

**Returns:** `CheckList` object with:

  - `id`: Checklist identifier
  - `name`: Checklist name
  - `items`: Array of `CheckListItem` objects
  - `percentComplete`: Completion percentage (0-100)

#### update\_checklist\_item

Update an existing checklist item.

```typescript
{
  name: 'update_checklist_item',
  arguments: {
    cardId: string,                          // ID of the card containing the checklist item
    checkItemId: string,                     // ID of the checklist item to update
    name?: string,                           // Optional: new checklist item text
    state?: 'complete' | 'incomplete',       // Optional: new checklist item state
    pos?: number | 'top' | 'bottom',         // Optional: new checklist item position
    due?: string | null,                     // Optional: ISO 8601 due date, or null to clear it
    dueReminder?: number | null,             // Optional: reminder offset in minutes, or null to clear it
    idMember?: string | null                 // Optional: member ID to assign, or null to clear it
  }
}
```

#### delete\_checklist\_item

Delete an existing checklist item.

```typescript
{
  name: 'delete_checklist_item',
  arguments: {
    cardId: string,       // ID of the card containing the checklist item
    checkItemId: string   // ID of the checklist item to delete
  }
}
```

### get\_card 🆕

Get comprehensive details of a specific Trello card with human-level parity.

```typescript
{
  name: 'get_card',
  arguments: {
    cardId: string,          // ID of the Trello card (short ID like 'FdhbArbK' or full ID)
    includeMarkdown?: boolean // Return formatted markdown instead of JSON (default: false)
  }
}
```

**Returns:** Complete card data including:

  - ✅ Checklists with item states and assignments
  - 📎 Attachments with previews and metadata
  - 🏷️ Labels with names and colors
  - 👥 Assigned members
  - 💬 Comments and activity
  - 📊 Statistics (badges)
  - 🎨 Cover images
  - 📍 Board and list context

### get\_cards\_by\_list\_id

Fetch all cards from a specific list.

```typescript
{
  name: 'get_cards_by_list_id',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    listId: string    // ID of the Trello list
  }
}
```

### get\_lists

Retrieve all lists from a board.

```typescript
{
  name: 'get_lists',
  arguments: {
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

### get\_recent\_activity

Fetch recent activity on a board.

```typescript
{
  name: 'get_recent_activity',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    limit?: number    // Optional: Number of activities to fetch (default: 10)
  }
}
```

### add\_card\_to\_list

Add a new card to a specified list.

```typescript
{
  name: 'add_card_to_list',
  arguments: {
    boardId?: string,     // Optional: ID of the board (uses default if not provided)
    listId: string,       // ID of the list to add the card to
    name: string,         // Name of the card
    description?: string, // Optional: Description of the card
  mbs; dueDate?: string,     // Optional: Due date (ISO 8601 format with time)
    start?: string,       // Optional: Start date (YYYY-MM-DD format, date only)
    labels?: string[]     // Optional: Array of label IDs
  }
}
```

### update\_card\_details

Update an existing card's details.

```typescript
{
  name: 'update_card_details',
  arguments: {
    boardId?: string,     // Optional: ID of the board (uses default if not provided)
    cardId: string,       // ID of the card to update
    name?: string,        // Optional: New name for the card
    description?: string, // Optional: New description
    dueDate?: string,     // Optional: New due date (ISO 8601 format with time)
    start?: string,       // Optional: New start date (YYYY-MM-DD format, date only)
    dueComplete?: boolean,// Optional: Mark the due date as complete (true) or incomplete (false)
    labels?: string[]     // Optional: New array of label IDs
  }
}
```

### archive\_card

Send a card to the archive.

```typescript
{
  name: 'archive_card',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    cardId: string    // ID of the card to archive
  }
}
```

### add\_list\_to\_board

Add a new list to a board.

```typescript
{
nbsp; name: 'add_list_to_board',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    name: string      // Name of the new list
  }
}
```

### archive\_list

Send a list to the archive.

```typescript
{
  name: 'archive_list',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    listId: string    // ID of the list to archive
  }
}
```

### update\_list

Update a list's name, archive state, subscription state, or board. Use `update_list_position` to reorder lists within a board.

```typescript
{
  name: 'update_list',
  arguments: {
    listId: string,          // ID of the list to update
    name?: string,           // Optional: New name for the list
    closed?: boolean,        // Optional: Whether to close (archive) the list
    subscribed?: boolean,    // Optional: Whether to subscribe to the list
    idBoard?: string         // Optional: ID of a board to move the list to
  }
}
```

### update\_list\_position

Update the position of a list on the board. Trello uses fractional indexing: each list has a float position, and to place a list between two others, use the average of their positions (e.g., between pos 1024 and 2048, use 1536). Use `"top"`/`"bottom"` shortcuts to move to the edges.

```typescript
{
  name: 'update_list_position',
  arguments: {
    listId: string,              // ID of the list to reposition
    position: string             // "top", "bottom", or a positive numeric string (e.g. "1536")
  }
}
```

### get\_my\_cards

Fetch all cards assigned to the current user.

```typescript
{
  name: 'get_my_cards',
  arguments: {}
}
```

### move\_card

Move a card to a different list.

```typescript
{
  name: 'move_card',
  arguments: {
    boardId?: string,  // Optional: ID of the target board (uses default if not provided)
s;   cardId: string,    // ID of the card to move
    listId: string     // ID of the target list
  }
}
```

### attach\_image\_to\_card

Attach an image to a card directly from a URL.

```typescript
{
  name: 'attach_image_to_card',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    cardId: string,  nbsp; // ID of the card to attach the image to
    imageUrl: string, // URL of the image to attach
    name?: string     // Optional: Name for the attachment (defaults to "Image Attachment")
  }
}
```

### attach\_file\_to\_card

Attach any type of file to a card from a URL or a local file path (e.g., `file:///path/to/your/file.pdf`).

```typescript
{
  name: 'attach_file_to_card',
nbsp; arguments: {
    boardId?: string,  // Optional: ID of the board (uses default if not provided)
    cardId: string,s;   // ID of the card to attach the file to
    fileUrl: string,   // URL or local file path (using the file:// protocol) of the file to attach
    name?: string,     // Optional: Name for the attachment (defaults to the file name for local files)
    mimeType?: string  // Optional: MIME type (e.g., "application/pdf", "text/plain", "video/mp4")
  }
}
```

### Comment Management Tools

#### add\_comment

Add a comment to a Trello card.

```typescript
{
  name: 'add_comment',
  arguments: {
    cardId: string,  // ID of the card to comment on
    text: string     // The text of the comment to add
  }
}
```

#### update\_comment

Update an existing comment on a card.

```typescript
{
  name: 'update_comment',
  arguments: {
    commentId: string,  // ID of the comment to change
    text: string        // The new text of the comment
  }
}
```

#### delete\_comment

Delete a comment from a card.

```typescript
{
  name: 'delete_comment',
  arguments: {
    commentId: string  // ID of the comment to delete
  }
}
```

#### get\_card\_comments

Retrieve all comments from a specific card without fetching all card data.

```typescript
{
  name: 'get_card_comments',
  arguments: {
    cardId: string,  // ID of the card to get comments from
    limit?: number   // Optional: Maximum number of comments to retrieve (default: 100)
  }
}
```


### list\_boards

List all boards the user has access to.

```typescript
{
  name: 'list_boards',
  arguments: {}
}
```

### set\_active\_board

Set the active board for future operations.

```typescript
{
  name: 'set_active_board',
  arguments: {
    boardId: string  // ID of the board to set as active
  }
}
```

### list\_workspaces

List all workspaces the user has access to.

```typescript
{
s; name: 'list_workspaces',
  arguments: {}
}
```

### set\_active\_workspace

Set the active workspace for future operations.

```typescript
{
  name: 'set_active_workspace',
  arguments: {
    workspaceId: string  // ID of the workspace to set as active
  }
}
```

### list\_boards\_in\_workspace

List all boards in a specific workspace.

```typescript
{
  name: 'list_boards_in_workspace',
  arguments: {
    workspaceId: string  // ID of the workspace to list boards from
  }
}
```

### get\_active\_board\_info

Get information about the currently active board.

```typescript
{
s; name: 'get_active_board_info',
  arguments: {}
}
```

### Custom Field Management Tools

> **Note:** Custom fields require Trello Standard plan or higher.

#### get\_board\_custom\_fields

Get all custom field definitions on a board. For dropdown/list fields, also returns the available options with their IDs.

```typescript
{
  name: 'get_board_custom_fields',
  arguments: {
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

**Returns:** Array of custom field definitions including:
- Field ID, name, type (`text`, `number`, `checkbox`, `date`, `list`)
- For `list` type fields: available options with IDs (use these IDs when setting values)

#### update\_card\_custom\_field

Set or clear a custom field value on a card.

```typescript
{
  name: 'update_card_custom_field',
  arguments: {
    cardId: string,       // ID of the card to update
    customFieldId: string,// ID of the custom field definition
    type: string,         // Field type: 'text' | 'number' | 'checkbox' | 'date' | 'list' | 'clear'
    value?: string        // The value to set (not needed when type is 'clear')
  }
}
```

**Value format by type:**
- `text`: any string
- `number`: numeric string (e.g. `"42.5"`)
- `checkbox`: `"true"` or `"false"`
- `date`: ISO 8601 string (e.g. `"2025-12-31T00:00:00.000Z"`)
- `list`: option ID from `get_board_custom_fields`
- `clear`: omit value to remove the field value

## Integration Examples

### 🎨 Pairing with Ideogram MCP Server

The Trello MCP server pairs beautifully with [@flowluap/ideogram-mcp-server](https://github.com/flowluap/ideogram-mcp-server) for AI-powered visual content creation. Generate images with Ideogram and attach them directly to your Trello cards\!

#### Example Workflow

1.  **Generate an image with Ideogram:**

<!-- end list -->

```typescript
// Using ideogram-mcp-server
{
  name: 'generate_image',
  arguments: {
    prompt: "A futuristic dashboard design with neon accents",
    aspect_ratio: "16:9"
  }
}
// Returns: { image_url: "https://..." }
```

2.  **Attach the generated image to a Trello card:**

<!-- end list -->

```typescript
// Using trello-mcp-server
{
  name: 'attach_image_to_card',
  arguments: {
    cardId: "your-card-id",
    imageUrl: "https://...", // URL from Ideogram
    name: "Dashboard Mockup v1"
  }
}
```

#### Setting up both servers

Add both servers to your Claude Desktop configuration. Use `bunx` for the fastest startup.

```json
{
  "mcpServers": {
    "trello": {
      "command": "bunx",
      "args": ["@delorenj/mcp-server-trello"],
nbsp;   "env": {
        "TRELLO_API_KEY": "your-trello-api-key",
        "TRELLO_TOKEN": "your-trello-token"
      }
    },
    "ideogram": {
      "command": "bunx",
      "args": ["@flowluap/ideogram-mcp-server"],
      "env": {
        "IDEOGRAM_API_KEY": "your-ideogram-api-key"
      }
    }
  }
}
```

Now you can seamlessly create visual content and organize it in Trello, all within Claude\!

## Rate Limiting

The server implements a token bucket algorithm for rate limiting to comply with Trello's API limits:

  - 300 requests per 10 seconds per API key
  - 100 requests per 10 seconds per token

Rate limiting is handled automatically, and requests will be queued if limits are reached.

## Error Handling

The server provides detailed error messages for various scenarios:

  - Invalid input parameters
  - Rate limit exceeded
  - API authentication errors
  - Network issues
  - Invalid board/list/card IDs

## Development

### Prerequisites

  - [Bun](https://bun.sh) (v1.0.0 or higher)

### Setup

1.  Clone the repository

<!-- end list -->

```bash
git clone https://github.com/delorenj/mcp-server-trello
cd mcp-server-trello
```

2.  Install dependencies

<!-- end list -->

```bash
bun install
```

3.  Build the project

<!-- end list -->

```bash
bun run build
```

## Running tests

To run the tests, run the following command:

```bash
bun test
```

## Running evals

The evals package loads an mcp client that then runs the index.ts file, so there is no need to rebuild between tests. You can load environment variables by prefixing the `bunx` command. Full documentation can be found [here](https://www.mcpevals.io/docs).

```bash
OPENAI_API_KEY=your-key bunx mcp-eval src/evals/evals.ts src/index.ts
```

## Contributing

Contributions are welcome\!

## License

This project is licensed under the MIT License - see the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.

## Acknowledgments

  - Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
  - Uses the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)
