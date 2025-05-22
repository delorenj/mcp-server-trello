[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/delorenj-mcp-server-trello-badge.png)](https://mseep.ai/app/delorenj-mcp-server-trello)

# MCP Server Trello
[![smithery badge](https://smithery.ai/badge/@modelcontextprotocol/mcp-server-trello)](https://smithery.ai/server/@modelcontextprotocol/mcp-server-trello)

A Model Context Protocol (MCP) server that provides tools for interacting with Trello boards. This server enables seamless integration with Trello's API while handling rate limiting, type safety, and error handling automatically.

<a href="https://glama.ai/mcp/servers/klqkamy7wt"><img width="380" height="200" src="https://glama.ai/mcp/servers/klqkamy7wt/badge" alt="Server Trello MCP server" /></a>

## Changelog

### 0.3.0

- Added board and workspace management capabilities:
  - `list_boards` - List all boards the user has access to
  - `set_active_board` - Set the active board for future operations
  - `list_workspaces` - List all workspaces the user has access to
  - `set_active_workspace` - Set the active workspace for future operations
  - `list_boards_in_workspace` - List all boards in a specific workspace
  - `get_active_board_info` - Get information about the currently active board
- Added persistent configuration storage to remember active board/workspace
- Improved error handling for all new operations

### 0.2.1

- Added detailed JSDoc comments to rate limiter functions
- Improved error handling for image attachment functionality
- Updated documentation for attach_image_to_card tool

### 0.2.0

- Added `attach_image_to_card` tool to attach images to cards from URLs
- Added Docker support with multi-stage build
- Improved security by moving environment variables to `.env`
- Added Docker Compose configuration
- Added `.env.template` for easier setup

### 0.1.1

- Added `move_card` tool to move cards between lists
- Improved documentation

### 0.1.0

- Initial release with basic Trello board management features

## Features

- **Full Trello Board Integration**: Interact with cards, lists, and board activities
- **Built-in Rate Limiting**: Respects Trello's API limits (300 requests/10s per API key, 100 requests/10s per token)
- **Type-Safe Implementation**: Written in TypeScript with comprehensive type definitions
- **Input Validation**: Robust validation for all API inputs
- **Error Handling**: Graceful error handling with informative messages
- **Dynamic Board Selection**: Switch between boards and workspaces without restarting

## Installation

### Docker Installation (Recommended)

The easiest way to run the server is using Docker:

1. Clone the repository:
```bash
git clone https://github.com/delorenj/mcp-server-trello
cd mcp-server-trello
```

2. Copy the environment template and fill in your Trello credentials:
```bash
cp .env.template .env
```

3. Build and run with Docker Compose:
```bash
docker compose up --build
```

### Installing via Smithery

To install Trello Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@modelcontextprotocol/mcp-server-trello):

```bash
npx -y @smithery/cli install @modelcontextprotocol/mcp-server-trello --client claude
```

### Manual Installation
```bash
npm install @delorenj/mcp-server-trello
```

## Configuration

### Environment Variables

The server can be configured using environment variables. Create a `.env` file in the root directory with the following variables:

```env
# Required: Your Trello API credentials
TRELLO_API_KEY=your-api-key
TRELLO_TOKEN=your-token

# Required: Initial board ID (can be changed later using set_active_board)
TRELLO_BOARD_ID=your-board-id

# Optional: Initial workspace ID (can be changed later using set_active_workspace)
TRELLO_WORKSPACE_ID=your-workspace-id
```

You can get these values from:
- API Key: https://trello.com/app-key
- Token: Generate using your API key
- Board ID: Found in the board URL (e.g., https://trello.com/b/BOARD_ID/board-name)
- Workspace ID: Found in workspace settings or using `list_workspaces` tool

### Board and Workspace Management

Starting with version 0.3.0, the MCP server supports dynamic board and workspace selection:

- The `TRELLO_BOARD_ID` in your `.env` file is used as the initial board ID when the server starts
- You can change the active board at any time using the `set_active_board` tool
- The selected board persists between server restarts (stored in `~/.trello-mcp/config.json`)
- Similarly, you can set and persist an active workspace using `set_active_workspace`

This allows you to work with multiple boards and workspaces without restarting the server or changing environment variables.

#### Example Workflow

1. Start by listing available boards:
```typescript
{
  name: 'list_boards',
  arguments: {}
}
```

2. Set your active board:
```typescript
{
  name: 'set_active_board',
  arguments: {
    boardId: "abc123"  // ID from list_boards response
  }
}
```

3. List workspaces if needed:
```typescript
{
  name: 'list_workspaces',
  arguments: {}
}
```

4. Set active workspace if needed:
```typescript
{
  name: 'set_active_workspace',
  arguments: {
    workspaceId: "xyz789"  // ID from list_workspaces response
  }
}
```

5. Check current active board info:
```typescript
{
  name: 'get_active_board_info',
  arguments: {}
}
```

## Available Tools

### get_cards_by_list_id

Fetch all cards from a specific list.

```typescript
{
  name: 'get_cards_by_list_id',
  arguments: {
    listId: string  // ID of the Trello list
  }
}
```

### get_lists

Retrieve all lists from the currently active board.

```typescript
{
  name: 'get_lists',
  arguments: {}
}
```

### get_recent_activity

Fetch recent activity on the currently active board.

```typescript
{
  name: 'get_recent_activity',
  arguments: {
    limit?: number  // Optional: Number of activities to fetch (default: 10)
  }
}
```

### add_card_to_list

Add a new card to a specified list.

```typescript
{
  name: 'add_card_to_list',
  arguments: {
    listId: string,       // ID of the list to add the card to
    name: string,         // Name of the card
    description?: string, // Optional: Description of the card
    dueDate?: string,    // Optional: Due date (ISO 8601 format)
    labels?: string[]    // Optional: Array of label IDs
  }
}
```

### update_card_details

Update an existing card's details.

```typescript
{
  name: 'update_card_details',
  arguments: {
    cardId: string,       // ID of the card to update
    name?: string,        // Optional: New name for the card
    description?: string, // Optional: New description
    dueDate?: string,    // Optional: New due date (ISO 8601 format)
    labels?: string[]    // Optional: New array of label IDs
  }
}
```

### archive_card

Send a card to the archive.

```typescript
{
  name: 'archive_card',
  arguments: {
    cardId: string  // ID of the card to archive
  }
}
```

### add_list_to_board

Add a new list to the currently active board.

```typescript
{
  name: 'add_list_to_board',
  arguments: {
    name: string  // Name of the new list
  }
}
```

### archive_list

Send a list to the archive.

```typescript
{
  name: 'archive_list',
  arguments: {
    listId: string  // ID of the list to archive
  }
}
```

### get_my_cards

Fetch all cards assigned to the current user.

```typescript
{
  name: 'get_my_cards',
  arguments: {}
}
```

### move_card

Move a card to a different list.

```typescript
{
  name: 'move_card',
  arguments: {
    cardId: string,  // ID of the card to move
    listId: string   // ID of the target list
  }
}
```

### attach_image_to_card

Attach an image to a card directly from a URL.

```typescript
{
  name: 'attach_image_to_card',
  arguments: {
    cardId: string,  // ID of the card to attach the image to
    imageUrl: string, // URL of the image to attach
    name?: string    // Optional: Name for the attachment (defaults to "Image Attachment")
  }
}
```

### list_boards

List all boards the user has access to.

```typescript
{
  name: 'list_boards',
  arguments: {}
}
```

### set_active_board

Set the active board for future operations.

```typescript
{
  name: 'set_active_board',
  arguments: {
    boardId: string  // ID of the board to set as active
  }
}
```

### list_workspaces

List all workspaces the user has access to.

```typescript
{
  name: 'list_workspaces',
  arguments: {}
}
```

### set_active_workspace

Set the active workspace for future operations.

```typescript
{
  name: 'set_active_workspace',
  arguments: {
    workspaceId: string  // ID of the workspace to set as active
  }
}
```

### list_boards_in_workspace

List all boards in a specific workspace.

```typescript
{
  name: 'list_boards_in_workspace',
  arguments: {
    workspaceId: string  // ID of the workspace to list boards from
  }
}
```

### get_active_board_info

Get information about the currently active board.

```typescript
{
  name: 'get_active_board_info',
  arguments: {}
}
```

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

- Node.js 16 or higher
- npm or yarn

### Setup

1. Clone the repository

```bash
git clone https://github.com/delorenj/mcp-server-trello
cd mcp-server-trello
```

2. Install dependencies

```bash
npm install
```

3. Build the project

```bash
npm run build
```


## Running evals

The evals package loads an mcp client that then runs the index.ts file, so there is no need to rebuild between tests. You can load environment variables by prefixing the npx command. Full documentation can be found [here](https://www.mcpevals.io/docs).

```bash
OPENAI_API_KEY=your-key  npx mcp-eval src/evals/evals.ts src/index.ts
```
## Contributing

Contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Uses the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)
