# Gotchas

These constraints prevent common Trello MCP mistakes.

## IDs

Trello board, list, card, checklist, label, and member IDs are opaque. Do not
infer them from names or URLs unless a tool response exposes the exact ID.

## Dates

- `start` uses `YYYY-MM-DD`.
- `dueDate` and checklist item `due` use full ISO 8601 timestamps.
- Use `null` only where a tool explicitly documents clearing a value.

## Rate limits

Trello applies these API ceilings:

- 300 requests per 10 seconds per API key.
- 100 requests per 10 seconds per token.

The server queues requests through its rate limiter. Agents must still avoid
unbounded polling and repeated broad discovery calls.

## Destructive actions

Treat these as destructive or externally visible:

- `archive_card`
- `archive_list`
- `delete_comment`
- `delete_checklist_item`
- `delete_label`
- `perform_system_repair`

Only run them when the user has clearly authorized the action.

## Proxies

Set `https_proxy` or `HTTPS_PROXY` when the environment requires outbound
traffic through a corporate proxy. The Trello client reads either variable.

## Recovery

If a write fails, re-run the relevant read tool before retrying. The object may
have moved, been archived, or changed between the original read and the write.
