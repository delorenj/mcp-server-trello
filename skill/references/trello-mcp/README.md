# Trello MCP reference

This reference routes agents to the smallest useful context for Trello MCP
work. Start here, then load only the file that matches the task.

## Choose the right reference

- Use `configuration.md` when installing the bundled server, configuring MCP
  clients, setting Trello credentials, or troubleshooting setup.
- Use `api.md` when you need the available tool names grouped by capability.
- Use `patterns.md` when you need a proven sequence for board discovery, card
  updates, checklist workflows, comments, labels, members, or attachments.
- Use `gotchas.md` when a workflow touches dates, IDs, rate limits, destructive
  operations, proxies, or error recovery.

## Default workflow

Most tasks follow the same path.

1. Discover boards with `list_boards`.
2. Select the target board with `set_active_board`.
3. Discover lists with `get_lists`.
4. Discover cards with `get_cards_by_list_id` or `get_card`.
5. Make the requested change with the narrowest tool that fits the task.
6. Re-read the affected card, list, checklist, or board to verify the change.

Do not invent Trello IDs. Fetch them from Trello through the MCP tools.
