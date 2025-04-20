# MCP Server Trello
[![smithery badge](https://smithery.ai/badge/@modelcontextprotocol/mcp-server-trello)](https://smithery.ai/server/@modelcontextprotocol/mcp-server-trello)

A Model Context Protocol (MCP) server that provides tools for interacting with Trello boards. This server enables seamless integration with Trello's API while handling rate limiting, type safety, and error handling automatically.

<a href="https://glama.ai/mcp/servers/klqkamy7wt"><img width="380" height="200" src="https://glama.ai/mcp/servers/klqkamy7wt/badge" alt="Server Trello MCP server" /></a>

## Changelog

### 0.1.2

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

The server can be configured using environment variables. Create a `.env` file in the root directory with the following variables:

```env
TRELLO_API_KEY=your-api-key
TRELLO_TOKEN=your-token
TRELLO_BOARD_ID=your-board-id
```

You can get these values from:
- API Key: https://trello.com/app-key
- Token: Generate using your API key
- Board ID: Found in the board URL

## Transports

This server supports two communication transport mechanisms:

1.  **Standard Input/Output (stdio)**: The default mode, suitable for local integrations like MCP Inspector or Claude Desktop. Messages are exchanged over the server process's stdin and stdout.
2.  **Server-Sent Events (SSE)**: An HTTP-based transport useful for remote connections or web-based clients. It uses SSE for server-to-client messages and HTTP POST for client-to-server messages.

### Selecting a Transport

- **Default (stdio)**: Run the server normally (e.g., `node build/index.js`).
- **SSE**: Set the `MCP_TRANSPORT=SSE` environment variable. You can also configure the port and paths:
  - `PORT`: Port for the HTTP server (default: `3001`).
  - `MCP_SSE_PATH`: Path for the SSE stream endpoint (default: `/sse`).
  - `MCP_MESSAGE_PATH`: Path for receiving client messages via POST (default: `/message`).

  Example:
  ```bash
  MCP_TRANSPORT=SSE PORT=4000 MCP_SSE_PATH=/trello-stream MCP_MESSAGE_PATH=/trello-msg node build/index.js
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

Retrieve all lists from the configured board.

```typescript
{
  name: 'get_lists',
  arguments: {}
}
```

### get_recent_activity

Fetch recent activity on the board.

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

Add a new list to the board.

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

## Testing

To ensure both transport modes work correctly after making changes:

### Prerequisites

- Ensure Trello credentials (`TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID`) are set in your environment or `.env` file.
- Build the project: `npm run build`

### Testing with stdio

1.  **Start the server with MCP Inspector**: In one terminal window, run:
    ```bash
    npx @modelcontextprotocol/inspector node build/index.js
    ```
2.  **Use the Inspector UI**: In the web UI that opens:
    - Navigate to the **Tools** tab.
    - Select the `get_lists` tool.
    - Click **Send**.
3.  **Verify**: You should see a JSON array of your Trello lists in the response panel. This confirms the default stdio transport is working.

### Testing with SSE

1.  **Start the server in SSE mode**: In one terminal window, run:
    ```bash
    MCP_TRANSPORT=SSE PORT=3001 node build/index.js
    ```
    Note the `sessionId` printed in the log message: `Trello MCP server (SSE) session started. POST messages to /message?sessionId=abc-123...`.

2.  **Open the SSE stream**: In a second terminal window, run:
    ```bash
    curl -N http://localhost:3001/sse
    ```
    You'll see the initial `endpoint` event. Keep this window open to see server-sent messages.

3.  **Send a message via POST**: In a third terminal window, use `curl` to call the `tools/list` method. Replace `abc-123...` with the actual `sessionId` from step 1:
    ```bash
    curl -X POST -H "Content-Type: application/json" \
         -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
         "http://localhost:3001/message?sessionId=abc-123..."
    ```

4.  **Verify**: 
    - The POST request (Window 3) should return `HTTP 202 Accepted`.
    - The SSE stream (Window 2) should receive a `message` event containing the JSON-RPC response with the list of available tools.

This confirms the SSE transport is correctly handling connections and messages.

### Automated SSE Test Script (Optional)

You can use this script (`scripts/sse-test.sh`) for quick regression testing:

```bash
#!/usr/bin/env bash
set -e

PORT=4000
SSE_PATH=/sse
MSG_PATH=/message

# Start server in background
 MCP_TRANSPORT=SSE PORT=$PORT MCP_SSE_PATH=$SSE_PATH MCP_MESSAGE_PATH=$MSG_PATH node build/index.js &
PID=$!

# Give server time to start
sleep 2

# Fetch session ID from SSE endpoint
SESSION_QUERY=$(curl -sN http://localhost:$PORT$SSE_PATH | grep -m1 "^data:" | cut -d'?' -f2)

if [ -z "$SESSION_QUERY" ]; then
  echo "Error: Could not get session ID from SSE endpoint." >&2
  kill $PID
  exit 1
fi

# Send tools/list request via POST
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
     "http://localhost:$PORT$MSG_PATH?$SESSION_QUERY")

# Cleanup
kill $PID

# Verify response code
if [ "$HTTP_CODE" = "202" ]; then
  echo "✅ SSE transport responded 202"
  exit 0
else
  echo "❌ SSE transport failed with HTTP code: $HTTP_CODE" >&2
  exit 1
fi
```

Make it executable (`chmod +x scripts/sse-test.sh`) and run it after making changes.

## Contributing

Contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Uses the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)
