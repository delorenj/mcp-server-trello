---
name: mcp-server-trello
description: Trello MCP Server skill for board discovery, card workflows, checklist management, comments, attachments, labels, members, board/workspace selection, and health monitoring through the bundled @delorenj/mcp-server-trello server.
---

# Trello MCP Server Skill

Use this skill when an agent needs to inspect or manage Trello boards through
the bundled MCP server. The skill carries its own server source in
`assets/source/` and installs it locally on first use.

## Activation

Before using Trello tools, verify that the local server has been installed.

1. Check for a built server at:
   `{XDG_DATA_HOME:-$HOME/.local/share}/mcp-server-trello-skill/server/build/index.js`
2. If it is missing, run:
   `bash {skill-root}/scripts/install.sh`
3. Confirm the MCP client has `TRELLO_API_KEY` and `TRELLO_TOKEN` configured.
   Optional values are `TRELLO_BOARD_ID`, `TRELLO_WORKSPACE_ID`,
   `https_proxy`, and `HTTPS_PROXY`.

The install script builds from `assets/source/` when Bun is available. If Bun is
not available, it falls back to the published package install path and creates a
local wrapper at the same `build/index.js` check path.

## Reading Order

Load only the reference needed for the current Trello task.

- Start with `references/trello-mcp/README.md` for routing.
- Use `references/trello-mcp/configuration.md` for authentication, install, and
  client setup.
- Use `references/trello-mcp/api.md` when you need tool names and parameters.
- Use `references/trello-mcp/patterns.md` for common board, card, checklist,
  and attachment workflows.
- Use `references/trello-mcp/gotchas.md` for date formats, IDs, rate limits,
  and recovery steps.

## Tool Routing

Choose tools by workflow, not by guessing IDs.

- Board discovery: `list_boards`, `set_active_board`,
  `get_active_board_info`, `list_workspaces`, `set_active_workspace`,
  `list_boards_in_workspace`.
- Lists and cards: `get_lists`, `get_cards_by_list_id`, `get_card`,
  `add_card_to_list`, `update_card_details`, `move_card`, `archive_card`,
  `copy_card`, `add_cards_to_list`, `get_my_cards`, `get_card_history`.
- Checklists: `create_checklist`, `get_checklist_items`,
  `add_checklist_item`, `find_checklist_items_by_description`,
  `get_acceptance_criteria`, `get_checklist_by_name`,
  `update_checklist_item`, `delete_checklist_item`, `copy_checklist`.
- Comments: `add_comment`, `update_comment`, `delete_comment`,
  `get_card_comments`.
- Attachments: `attach_image_to_card`, `attach_file_to_card`,
  `attach_image_data_to_card`, `download_attachment`.
- Labels and members: `get_board_labels`, `create_label`, `update_label`,
  `delete_label`, `get_board_members`, `assign_member_to_card`,
  `remove_member_from_card`.
- Health: `get_health`, `get_health_detailed`, `get_health_metadata`,
  `get_health_performance`, `perform_system_repair`.

## Agent Rules

- Always discover the board, list, card, checklist, label, or member ID through
  tools before writing changes.
- Prefer `set_active_board` after board discovery when several operations target
  the same board.
- Use start dates as `YYYY-MM-DD`. Use due dates as full ISO 8601 timestamps.
- Treat Trello API writes as external side effects. Confirm destructive actions
  such as archive, delete, or repair unless the user already authorized them.
- Respect Trello rate limits: 300 requests per 10 seconds per API key and 100
  requests per 10 seconds per token. The server queues requests, but agents
  should still batch discovery and avoid polling loops.
