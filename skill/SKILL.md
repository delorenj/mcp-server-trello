---
name: mcp-server-trello
description: 'Trello MCP Server integration skill. Provides tools and context for interacting with Trello boards, cards, lists, and checklists.'
---

# Trello MCP Server Skill

**Goal:** Provide full integration with Trello via the Model Context Protocol.

## Activation & Setup

When this skill is invoked or added to a project, first check if the MCP server has been installed.

1. **First-time Setup:** If the server is not installed, this is the first time the skill is being used. 
   - Execute the bundled installation script: `bash {skill-root}/scripts/install.sh`
   - This will use `bunx` and Smithery to install the MCP server from the registry.
   - Note: The user will need to configure their `TRELLO_API_KEY` and `TRELLO_TOKEN` in their MCP settings (usually handled by Smithery or their client).

## Using the Trello MCP Tools

Once installed, the Trello MCP Server provides a comprehensive suite of tools for managing Trello. 

### Key Capabilities
- **Cards:** You can fetch, create, move, update, and archive cards. (e.g. `get_card`, `add_card_to_list`)
- **Checklists:** You can manage checklist items, add new items, search descriptions, and mark items complete.
- **Lists & Boards:** You can navigate through lists and workspaces dynamically (e.g. `list_boards`, `get_lists`).
- **Attachments:** You can attach images and files via URLs.

### Guidelines for Agents
- Always use the provided MCP tools to fetch the state of the board. Do not guess card IDs.
- For finding a card, typically you list boards (`list_boards`), set the active board (`set_active_board`), fetch the lists (`get_lists`), and fetch the cards for a list (`get_cards_by_list_id`).
- Respect rate limits. The server automatically handles Trello API rate limiting (300 reqs/10s).
- Start dates must be `YYYY-MM-DD` while due dates should be full ISO 8601 strings.
