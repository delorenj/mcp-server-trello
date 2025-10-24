# GitHub Copilot Instructions for MCP Server Trello

This document provides context and guidelines for GitHub Copilot when working with the MCP Server Trello codebase.

## Project Overview

MCP Server Trello is a Model Context Protocol (MCP) server that provides tools for interacting with Trello boards. The project is powered by Bun runtime for maximum performance and is written in TypeScript with strict type safety.

## Tech Stack

- **Runtime**: Bun (v1.0.0+), but also compatible with Node.js via npm/npx
- **Language**: TypeScript 5.3+
- **Build Tool**: TypeScript Compiler (tsc)
- **Primary Dependencies**:
  - `@modelcontextprotocol/sdk` - MCP protocol implementation
  - `axios` - HTTP client for Trello API
  - `zod` - Runtime type validation
  - `form-data` - File upload handling
- **Code Quality**: ESLint + Prettier
- **Testing**: Not yet implemented (contributions welcome)

## Architecture

### Project Structure

```
src/
├── index.ts                 # Main MCP server implementation and tool registration
├── trello-client.ts         # Trello API client with rate limiting
├── rate-limiter.ts          # Token bucket rate limiter implementation
├── types.ts                 # TypeScript type definitions
├── validators.ts            # Zod schemas for input validation
├── health/                  # Health monitoring endpoints
│   ├── health-endpoints.ts  # Health check MCP tools
│   └── health-monitor.ts    # Health monitoring logic
└── evals/                   # Evaluation tests (using mcp-evals)
```

### Key Components

1. **TrelloServer** (`src/index.ts`): Main server class that:
   - Registers MCP tools via `registerTool()`
   - Handles tool invocations
   - Manages error handling
   - Sets up health monitoring

2. **TrelloClient** (`src/trello-client.ts`): API client that:
   - Manages authentication (API key + token)
   - Implements rate limiting (300 req/10s per key, 100 req/10s per token)
   - Provides methods for all Trello operations
   - Handles board/workspace persistence via `~/.trello-mcp/config.json`

3. **Rate Limiter** (`src/rate-limiter.ts`):
   - Token bucket algorithm implementation
   - Separate buckets for API key and token limits
   - Automatic request queuing when limits are reached

## Development Guidelines

### Building

```bash
# Preferred (if Bun is installed)
bun run build

# Alternative (works anywhere)
npx tsc
```

The build output goes to the `build/` directory.

### Code Style

- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes preferred
- **Semicolons**: Required
- **Line Length**: 100 characters max
- **Import Style**: ES modules only
- **Trailing Commas**: ES5 style
- **Arrow Functions**: Avoid parentheses for single parameters

Run linting:
```bash
npx eslint src --ext .ts
```

Run formatting:
```bash
npx prettier --write src
```

### TypeScript Guidelines

- **Strict mode enabled**: All code must comply with strict TypeScript
- **No implicit any**: Always provide explicit types
- **Return types**: Explicit return types are preferred for public methods
- **Error handling**: Use `try/catch` and return structured error objects
- **Async/await**: Preferred over raw promises

### Environment Variables

Required:
- `TRELLO_API_KEY` - Get from https://trello.com/app-key
- `TRELLO_TOKEN` - Generate using API key authorization flow

Optional:
- `TRELLO_BOARD_ID` - Default board (can be changed via `set_active_board` tool)
- `TRELLO_WORKSPACE_ID` - Initial workspace (can be changed via `set_active_workspace` tool)

### Adding New Tools

When adding a new MCP tool:

1. **Define the tool schema** using Zod in the `registerTool()` call
2. **Implement validation** using the validators in `src/validators.ts`
3. **Add the method** to `TrelloClient` if it requires API calls
4. **Handle errors gracefully** using the `handleError()` pattern
5. **Update README.md** with the new tool documentation
6. **Consider rate limiting** - all API calls are automatically rate-limited

Example tool structure:
```typescript
this.server.registerTool(
  'tool_name',
  {
    title: 'Human Readable Title',
    description: 'Clear description of what this tool does',
    inputSchema: {
      param1: z.string().describe('Description of param1'),
      param2: z.string().optional().describe('Optional description'),
    },
  },
  async ({ param1, param2 }) => {
    try {
      const result = await this.trelloClient.someMethod(param1, param2);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
);
```

### Working with the Trello API

- **API Documentation**: https://developer.atlassian.com/cloud/trello/rest/
- **Rate Limits**: Automatically handled by `RateLimiter` class
- **Authentication**: API key + token passed via query parameters
- **Error Handling**: Use `McpError` from the SDK for user-facing errors
- **Board Management**: Support both explicit `boardId` parameter and default board

### Common Patterns

**Date Formats**:
- `dueDate`: Full ISO 8601 with time (e.g., `2023-12-31T12:00:00Z`)
- `start`: Date only in YYYY-MM-DD format (e.g., `2025-08-05`)

**Board ID Resolution**:
```typescript
// Most methods accept optional boardId, falling back to default
const effectiveBoardId = boardId || this.config.boardId;
if (!effectiveBoardId) {
  throw new McpError(
    ErrorCode.InvalidRequest,
    'No board ID provided and no default board set'
  );
}
```

**Error Response Format**:
```typescript
return {
  content: [
    {
      type: 'text' as const,
      text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    },
  ],
  isError: true,
};
```

## Testing

Currently, there is no automated test suite. Contributions to add testing infrastructure are welcome!

For manual testing:
1. Set up environment variables in `.env` (copy from `.env.template`)
2. Build the project: `npx tsc`
3. Run via MCP client or use the examples in the `examples/` directory

For evaluations (requires OpenAI API key):
```bash
OPENAI_API_KEY=your-key npx mcp-eval src/evals/evals.ts src/index.ts
```

## Docker Development

The project includes Docker support:

```bash
# Copy environment template
cp .env.template .env
# Edit .env with your credentials

# Build and run
docker compose up --build
```

## Contributing

Please review `CONTRIBUTING.md` for detailed contribution guidelines.

Key points:
- Fork and create a branch from `main`
- Add tests for new features (when test infrastructure exists)
- Update documentation for API changes
- Ensure code passes linting: `npx eslint src --ext .ts`
- Format code with Prettier: `npx prettier --write src`
- Follow the GitHub Flow workflow

## Files to Avoid Modifying

- `package-lock.json` - Managed by npm, don't edit manually
- `build/` - Generated output, not committed to git
- `node_modules/` - Dependencies, not committed to git
- `.env` - Local environment variables, not committed (use `.env.template` as reference)

## Important Notes

1. **Backward Compatibility**: The project supports both Bun and Node.js runtimes. Ensure changes work with both.

2. **MCP Protocol**: Follow MCP SDK conventions for tool registration and responses.

3. **Rate Limiting**: Never bypass the rate limiter - Trello will ban the API key if limits are exceeded.

4. **Error Messages**: Provide clear, actionable error messages to end users.

5. **Security**: Never commit API keys or tokens. Use environment variables.

## Useful Commands

```bash
# Install dependencies
npm install

# Build the project
npx tsc

# Format code
npx prettier --write src

# Lint code
npx eslint src --ext .ts

# Publish to npm (maintainers only)
npm publish

# Run via npx (users)
npx @delorenj/mcp-server-trello

# Run via bunx (users, faster)
bunx @delorenj/mcp-server-trello
```

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)
- [MCP Registry](https://registry.modelcontextprotocol.io/)
