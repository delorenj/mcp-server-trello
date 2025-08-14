# MCP Server Trello

[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/27359682-7632-4ba7-981d-7dfecadf1c4b)

<a href="https://glama.ai/mcp/servers/klqkamy7wt"><img width="380" height="200" src="https://glama.ai/mcp/servers/klqkamy7wt/badge" alt="Server Trello MCP server" /></a>

A Model Context Protocol (MCP) server that provides tools for interacting with Trello boards. This server enables seamless integration with Trello's API while handling rate limiting, type safety, and error handling automatically.

## 🎉 New in v1.2.0: Complete Checklist Management Suite!

**Comprehensive Checklist Tools are here!** 🚀 Now you can fully manage Trello checklists with 5 powerful new tools! Search, create, and track checklist items across your boards. Perfect for managing acceptance criteria, development tasks, and project milestones!

### ✨ New Checklist Tools:
- 📋 **`get_checklist_items`** - Retrieve all items from any checklist by name
- ➕ **`add_checklist_item`** - Add new items to existing checklists  
- 🔍 **`find_checklist_items_by_description`** - Search checklist items by text content
- ✅ **`get_acceptance_criteria`** - Quick access to "Acceptance Criteria" checklists
- 📊 **`get_checklist_by_name`** - Get complete checklist with completion percentage

**Plus:** Modern MCP SDK architecture, enhanced type safety, and comprehensive documentation!

## Changelog

### 1.2.0

**🎊 Major Feature Release: Complete Checklist Management Suite**

- **5 New Checklist Tools** for comprehensive checklist management:
  - `get_checklist_items(name)` - Retrieve all items from a checklist by name
  - `add_checklist_item(text, checkListName)` - Add new items to existing checklists
  - `find_checklist_items_by_description(description)` - Search checklist items by text content
  - `get_acceptance_criteria()` - Convenience method for "Acceptance Criteria" checklists
  - `get_checklist_by_name(name)` - Get complete checklist with completion percentage
- **Modern MCP SDK Architecture:** Refactored to use latest MCP TypeScript SDK patterns with `registerTool()` and Zod validation
- **Enhanced Type Safety:** Full TypeScript support with proper type conversions between Trello API and MCP types
- **New Data Types:** `CheckList` and `CheckListItem` interfaces for structured checklist data
- **Comprehensive Documentation:** Added `CHECKLIST_TOOLS.md` with examples and best practices
- **Improved Error Handling:** Consistent error responses with descriptive messages
- **Runtime Validation:** Zod schemas for all tool inputs with automatic validation

### 1.1.0

**🎊 Major Feature Release: Complete Card Data Extraction**

- Added powerful `get_card` tool for comprehensive single card data retrieval
- **Enhanced Data Extraction:**
  - ✅ **Checklists** - Full checklist support with items, completion states, member assignments, and due dates
  - 📎 **Attachments** - Complete attachment data including images, previews, file metadata, and inline image detection
  - 🏷️ **Labels** - Full label details (names and colors, not just IDs)
  - 👥 **Members** - Card member assignments with full profile information
  - 💬 **Comments** - Card activity and comment history
  - 📊 **Badges** - Statistics including checklist progress, comment counts, and attachment counts
  - 🎨 **Cover Images** - Card cover image support
  - 📍 **Context** - Board and list information for complete context
  - 🔧 **Custom Fields** - Support for board-specific custom fields
- **Markdown Formatting:** New `includeMarkdown` parameter returns beautifully formatted, human-readable card data
- **Inline Image Parsing:** Automatically detects and extracts images embedded in card descriptions
- **Comprehensive API Integration:** Single API call fetches all card data efficiently using optimized query parameters
- **Type Safety:** Added new TypeScript interfaces for all enhanced data structures
- **Human Parity:** Achieves complete parity with Trello UI - see everything a human sees

### 1.0.0

- Fixed MCP protocol compatibility by removing all console output that interfered with JSON-RPC communication
- Improved pnpx support - now works seamlessly with `pnpx @delorenj/mcp-server-trello`
- Updated installation docs to feature pnpx as the primary installation method
- Added mise installation instructions for convenient tool management
- Production-ready release with stable API

### 0.3.0

- Added multi-board support - all methods now accept optional `boardId` parameter (thanks @blackoutnet!)
- `TRELLO_BOARD_ID` environment variable is now optional and serves as default board
- Added board and workspace management capabilities:
  - `list_boards` - List all boards the user has access to
  - `set_active_board` - Set the active board for future operations
  - `list_workspaces` - List all workspaces the user has access to
  - `set_active_workspace` - Set the active workspace for future operations
  - `list_boards_in_workspace` - List all boards in a specific workspace
  - `get_active_board_info` - Get information about the currently active board
- Added persistent configuration storage to remember active board/workspace
- Improved error handling with MCP-specific error types
- Full backward compatibility maintained

### 0.2.1

- Added detailed JSDoc comments to rate limiter functions
- Improved error handling for image attachment functionality
- Updated documentation for attach_image_to_card tool

### 0.2.1

- Added `attach_file_to_card` tool to attach any type of file (PDFs, documents, videos, etc.) to cards from URLs
- Enhanced attachment support beyond just images
- Kept `attach_image_to_card` for backward compatibility

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
- **🆕 Complete Card Data Extraction**: Fetch all card details including checklists, attachments, labels, members, and comments
- **File Attachments**: Attach any type of file to cards (PDFs, documents, videos, images, etc.) from URLs
- **Built-in Rate Limiting**: Respects Trello's API limits (300 requests/10s per API key, 100 requests/10s per token)
- **Type-Safe Implementation**: Written in TypeScript with comprehensive type definitions
- **Input Validation**: Robust validation for all API inputs
- **Error Handling**: Graceful error handling with informative messages
- **Dynamic Board Selection**: Switch between boards and workspaces without restarting
- **Markdown Formatting**: Export card data in human-readable markdown format

## Installation

### Quick Start with pnpx (Recommended)

The easiest way to use the Trello MCP server is with `pnpx`, which doesn't require a global install:

```json
{
  "mcpServers": {
    "trello": {
      "command": "pnpx",
      "args": ["@delorenj/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

Or if you're using mise:

```json
{
  "mcpServers": {
    "trello": {
      "command": "mise",
      "args": ["x", "--", "pnpx", "@delorenj/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

To connect a Trello workspace, you'll need to manually retrieve a `TRELLO_TOKEN` once per workspace. After setting up your Trello Power-Up, visit the following URL:

```
https://trello.com/1/authorize?expiration=never&name=YOUR_APP_NAME&scope=read,write&response_type=token&key=YOUR_API_KEY
```

Replace:

* `YOUR_APP_NAME` with a name for your application (e.g., "My Trello Integration"). This name is shown to the user on the Trello authorization screen.
* `YOUR_API_KEY` with the API key for your Trello Power-Up

This will generate the token required for integration.

> [!NOTE]
> The `expiration=never` parameter creates a token that does not expire. For enhanced security, consider using `expiration=30days` and renewing the token periodically if your setup allows for it.


#### Don't have pnpm?

The simplest way to get `pnpm` (and thus `pnpx`) is through [mise](https://mise.jdx.dev/):

```bash
# Install mise (if you don't have it)
curl https://mise.run | sh

# Install pnpm with mise
mise install pnpm
```

### Installing via npm

If you prefer using npm directly:

```bash
npm install -g @delorenj/mcp-server-trello
```

Then use `mcp-server-trello` as the command in your MCP configuration.

### Installing via Smithery

To install Trello Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@modelcontextprotocol/mcp-server-trello):

```bash
npx -y @smithery/cli install @modelcontextprotocol/mcp-server-trello --client claude
```

### Docker Installation

For containerized environments:

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
```

You can get these values from:

- API Key: <https://trello.com/app-key>
- Token: Generate using your API key
- Board ID (optional, deprecated): Found in the board URL (e.g., <https://trello.com/b/BOARD_ID/board-name>)
- Workspace ID: Found in workspace settings or using `list_workspaces` tool

### Board and Workspace Management

Starting with version 0.3.0, the MCP server supports multiple ways to work with boards:

1. **Multi-board support**: All methods now accept an optional `boardId` parameter
   - Omit `TRELLO_BOARD_ID` and provide `boardId` in each API call
   - Set `TRELLO_BOARD_ID` as default and optionally override with `boardId` parameter

2. **Dynamic board selection**: Use workspace management tools
   - The `TRELLO_BOARD_ID` in your `.env` file is used as the initial/default board ID
   - You can change the active board at any time using the `set_active_board` tool
   - The selected board persists between server restarts (stored in `~/.trello-mcp/config.json`)
   - Similarly, you can set and persist an active workspace using `set_active_workspace`

This allows you to work with multiple boards and workspaces without restarting the server.

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

## Date Format Guidelines

When working with dates in the Trello MCP server, please note the different format requirements:

- **Due Date (`dueDate`)**: Accepts full ISO 8601 format with time (e.g., `2023-12-31T12:00:00Z`)
- **Start Date (`start`)**: Accepts date only in YYYY-MM-DD format (e.g., `2025-08-05`)

This distinction follows Trello's API conventions where start dates are day-based markers while due dates can include specific times.

## Available Tools

### Checklist Management Tools 🆕

#### get_checklist_items

Get all items from a checklist by name.

```typescript
{
  name: 'get_checklist_items',
  arguments: {
    name: string,        // Name of the checklist to retrieve items from
    boardId?: string     // Optional: ID of the board (uses default if not provided)
  }
}
```

#### add_checklist_item

Add a new item to an existing checklist.

```typescript
{
  name: 'add_checklist_item',
  arguments: {
    text: string,           // Text content of the checklist item
    checkListName: string,  // Name of the checklist to add the item to
    boardId?: string        // Optional: ID of the board (uses default if not provided)
  }
}
```

#### find_checklist_items_by_description

Search for checklist items containing specific text.

```typescript
{
  name: 'find_checklist_items_by_description',
  arguments: {
    description: string,  // Text to search for in checklist item descriptions
    boardId?: string      // Optional: ID of the board (uses default if not provided)
  }
}
```

#### get_acceptance_criteria

Get all items from the "Acceptance Criteria" checklist.

```typescript
{
  name: 'get_acceptance_criteria',
  arguments: {
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

#### get_checklist_by_name

Get a complete checklist with all items and completion percentage.

```typescript
{
  name: 'get_checklist_by_name',
  arguments: {
    name: string,     // Name of the checklist to retrieve
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

**Returns:** `CheckList` object with:
- `id`: Checklist identifier
- `name`: Checklist name
- `items`: Array of `CheckListItem` objects
- `percentComplete`: Completion percentage (0-100)

### get_card 🆕

Get comprehensive details of a specific Trello card with human-level parity.

```typescript
{
  name: 'get_card',
  arguments: {
    cardId: string,          // ID of the Trello card (short ID like 'FdhbArbK' or full ID)
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

### get_cards_by_list_id

Fetch all cards from a specific list.

```typescript
{
  name: 'get_cards_by_list_id',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    listId: string    // ID of the Trello list
  }
}
```

### get_lists

Retrieve all lists from a board.

```typescript
{
  name: 'get_lists',
  arguments: {
    boardId?: string  // Optional: ID of the board (uses default if not provided)
  }
}
```

### get_recent_activity

Fetch recent activity on a board.

```typescript
{
  name: 'get_recent_activity',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    limit?: number    // Optional: Number of activities to fetch (default: 10)
  }
}
```

### add_card_to_list

Add a new card to a specified list.

```typescript
{
  name: 'add_card_to_list',
  arguments: {
    boardId?: string,     // Optional: ID of the board (uses default if not provided)
    listId: string,       // ID of the list to add the card to
    name: string,         // Name of the card
    description?: string, // Optional: Description of the card
    dueDate?: string,     // Optional: Due date (ISO 8601 format with time)
    start?: string,       // Optional: Start date (YYYY-MM-DD format, date only)
    labels?: string[]     // Optional: Array of label IDs
  }
}
```

### update_card_details

Update an existing card's details.

```typescript
{
  name: 'update_card_details',
  arguments: {
    boardId?: string,     // Optional: ID of the board (uses default if not provided)
    cardId: string,       // ID of the card to update
    name?: string,        // Optional: New name for the card
    description?: string, // Optional: New description
    dueDate?: string,     // Optional: New due date (ISO 8601 format with time)
    start?: string,       // Optional: New start date (YYYY-MM-DD format, date only)
    dueComplete?: boolean,// Optional: Mark the due date as complete (true) or incomplete (false)
    labels?: string[]     // Optional: New array of label IDs
  }
}
```

### archive_card

Send a card to the archive.

```typescript
{
  name: 'archive_card',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    cardId: string    // ID of the card to archive
  }
}
```

### add_list_to_board

Add a new list to a board.

```typescript
{
  name: 'add_list_to_board',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    name: string      // Name of the new list
  }
}
```

### archive_list

Send a list to the archive.

```typescript
{
  name: 'archive_list',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    listId: string    // ID of the list to archive
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
    boardId?: string,  // Optional: ID of the target board (uses default if not provided)
    cardId: string,    // ID of the card to move
    listId: string     // ID of the target list
  }
}
```

### attach_image_to_card

Attach an image to a card directly from a URL.

```typescript
{
  name: 'attach_image_to_card',
  arguments: {
    boardId?: string, // Optional: ID of the board (uses default if not provided)
    cardId: string,   // ID of the card to attach the image to
    imageUrl: string, // URL of the image to attach
    name?: string     // Optional: Name for the attachment (defaults to "Image Attachment")
  }
}
```

### attach_file_to_card

Attach any type of file to a card from a URL or a local file path (e.g., `file:///path/to/your/file.pdf`).

```typescript
{
  name: 'attach_file_to_card',
  arguments: {
    boardId?: string,  // Optional: ID of the board (uses default if not provided)
    cardId: string,    // ID of the card to attach the file to
    fileUrl: string,   // URL or local file path (using the file:// protocol) of the file to attach
    name?: string,     // Optional: Name for the attachment (defaults to the file name for local files)
    mimeType?: string  // Optional: MIME type (e.g., "application/pdf", "text/plain", "video/mp4")
  }
}

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

## Integration Examples

### 🎨 Pairing with Ideogram MCP Server

The Trello MCP server pairs beautifully with [@flowluap/ideogram-mcp-server](https://github.com/flowluap/ideogram-mcp-server) for AI-powered visual content creation. Generate images with Ideogram and attach them directly to your Trello cards!

![Ideogram + Trello Integration Example](https://ss.delo.sh/hosted/20250717-0619.png)

#### Example Workflow

1. **Generate an image with Ideogram:**
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

2. **Attach the generated image to a Trello card:**
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

Add both servers to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "trello": {
      "command": "pnpx",
      "args": ["@delorenj/mcp-server-trello"],
      "env": {
        "TRELLO_API_KEY": "your-trello-api-key",
        "TRELLO_TOKEN": "your-trello-token"
      }
    },
    "ideogram": {
      "command": "pnpx",
      "args": ["@flowluap/ideogram-mcp-server"],
      "env": {
        "IDEOGRAM_API_KEY": "your-ideogram-api-key"
      }
    }
  }
}
```

Now you can seamlessly create visual content and organize it in Trello, all within Claude!

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
