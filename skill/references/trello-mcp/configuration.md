# Configuration

The skill bundles the Trello MCP server source and installs it locally on first
use. The server communicates over MCP stdio and requires Trello API
credentials.

## Install

Run the bundled installer from the skill root.

```bash
bash {skill-root}/scripts/install.sh
```

When Bun is available, the installer copies `assets/source/` to
`{XDG_DATA_HOME:-$HOME/.local/share}/mcp-server-trello-skill/server`, installs
dependencies, and builds `build/index.js`. When Bun is unavailable, it falls
back to the published Smithery installation path and creates a local
`build/index.js` wrapper that launches the published package through `npx`.

## MCP command

For clients that need a direct command, use the built server path.

```json
{
  "mcpServers": {
    "trello": {
      "command": "node",
      "args": [
        "{XDG_DATA_HOME:-$HOME/.local/share}/mcp-server-trello-skill/server/build/index.js"
      ],
      "env": {
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token"
      }
    }
  }
}
```

Expand `{XDG_DATA_HOME:-$HOME/.local/share}` before adding the command to a
client configuration.

## Environment variables

- `TRELLO_API_KEY`: Required Trello API key.
- `TRELLO_TOKEN`: Required Trello token for the Trello account.
- `TRELLO_BOARD_ID`: Optional initial board ID.
- `TRELLO_WORKSPACE_ID`: Optional initial workspace ID.
- `https_proxy` or `HTTPS_PROXY`: Optional HTTPS proxy for restricted networks.

Get the API key from `https://trello.com/app-key`, then generate a token from
that key page.

## Build artifacts

The install script writes generated runtime files under the user data directory,
not inside the skill. The source of truth remains `assets/source/` in this skill
package.
