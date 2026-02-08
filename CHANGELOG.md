# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **List Position Management**: `update_list_position(listId, position)` - Reorder lists on a board using Trello's fractional indexing ("top", "bottom", or a numeric position)

## [1.7.0] - 2025-12-17

### Added
- **Checklist Management**: Comprehensive tools for checklist operations:
  - `create_checklist(name, cardId)` - Create new checklists
  - `get_checklist_items(name, cardId?)` - Get items from a checklist (enhanced with optional cardId)
  - `add_checklist_item(text, checkListName, cardId?)` - Add items to checklists
  - `find_checklist_items_by_description(description, cardId?)` - Search items by description
  - `get_acceptance_criteria(cardId?)` - Get acceptance criteria checklist
  - `get_checklist_by_name(name, cardId?)` - Get complete checklist with completion percentage
  - `update_checklist_item(cardId, checkItemId, state)` - Mark items as complete/incomplete

- **Member Management**: Tools for managing board members:
  - `get_board_members(boardId?)` - Get all board members
  - `assign_member_to_card(cardId, memberId)` - Assign members to cards
  - `remove_member_from_card(cardId, memberId)` - Remove members from cards

- **Label Management**: Full suite of label management tools:
  - `get_board_labels(boardId?)` - Get all board labels
  - `create_label(boardId?, name, color?)` - Create new labels
  - `update_label(labelId, name?, color?)` - Update existing labels
  - `delete_label(labelId)` - Delete labels

- **Attachment Enhancements**:
  - `attach_image_data_to_card` - Attach images directly from base64/data URLs (useful for screenshots)

- **Card History**:
  - `get_card_history(cardId, filter?, limit?)` - Fetch history and actions for a specific card

## [1.6.3] - 2025-10-22

### Added
- **Release Script**: Added `release` script to package.json for streamlined release workflow
- The release script now runs `bun run build && npm publish` to build and publish in one command
- **GitHub Workflow**: Added automatic NPM publishing workflow that triggers on PR merge to main

### Changed

- **Version Bump**: Updated version from 1.6.2 to 1.6.3

## [1.6.1] - 2025-10-16

### Fixed

- **CHANGELOG**: Corrected release date for v1.6.0 from 2025-01-16 to 2025-10-16

## [1.6.0] - 2025-10-16

### Added

- **Complete Comment Management**: Four new tools for managing comments on Trello cards:
  - `add_comment(cardId, text)` - Add a comment to a card (previously available)
  - `update_comment(commentId, text)` - Update an existing comment (previously available)
  - `delete_comment(commentId)` - Delete a comment from a card (NEW)
  - `get_card_comments(cardId, limit?)` - Retrieve all comments from a card without fetching all card data (NEW)
- Enhanced comment functionality addresses feature request #24

## [1.5.1] - 2025-09-21

### Fixed

- **Build Process**: Fixed the build process by adding a `build` script to `package.json` that runs `bunx tsc`.
- **Dockerfile**: Migrated the `Dockerfile` from `pnpm` to `bun`.

### Changed

- **README.md**: Updated the `README.md` file with the correct build and test instructions.
- **Dependencies**: Removed `pnpm-lock.yaml` and `package-lock.json`.

## [1.5.0] - 2025-09-21

### Changed

- **Complete Node.js → Bun Migration**: Migrated the entire project to the Bun runtime, resulting in a 2.8-4.4x performance boost.
- Replaced `@types/node` and `ts-node` with `bun-types` for native Bun support.
- Updated build scripts and test commands to use `bun` instead of `node` and `npm`.
- Updated `package.json` to reflect the new engine requirement.

### Added

- Documentation updated to recommend `bunx` for optimal performance, while maintaining full backward compatibility with `npx` and `pnpx`.

## [1.4.0] - 2025-09-21

### Added

- **Comprehensive Examples**: Added a new `examples` directory with detailed implementations in JavaScript, Python, and TypeScript.
- **Extensive Usage Documentation**: Created `usage-examples.md` with over 800 lines of documentation, including:
  - Advanced workflow examples for sprint management, bug tracking, and release management.
  - AI integration examples, including a workflow with the Ideogram MCP server.
  - Best practices for production-ready patterns, error handling, and advanced features like template systems and time tracking.
- `.gitignore` updated to exclude `system-metrics.json`.

### Changed

- **Version Bump**: Updated `package.json` version from `1.3.1` to `1.4.0`.

## [1.2.0] - 2025-01-07

### Added

- **Comprehensive Checklist Management Tools** - Five new tools for managing Trello checklists:
  - `get_checklist_items(name)` - Retrieve all items from a checklist by name
  - `add_checklist_item(text, checkListName)` - Add new items to existing checklists
  - `find_checklist_items_by_description(description)` - Search checklist items by text content
  - `get_acceptance_criteria()` - Convenience method for "Acceptance Criteria" checklists
  - `get_checklist_by_name(name)` - Get complete checklist with completion percentage

### Added - Data Types

- `CheckList` interface with id, name, items, and percentComplete fields
- `CheckListItem` interface with id, text, complete, and parentCheckListId fields
- Type conversion utilities between Trello API types and MCP types

### Added - Documentation

- Comprehensive `CHECKLIST_TOOLS.md` documentation with examples and best practices
- API reference for all checklist tools
- Usage examples and integration guidance

### Changed

- **BREAKING**: Refactored from low-level `Server` class to modern `McpServer` class
- **BREAKING**: Replaced manual tool registration with `registerTool()` method
- **BREAKING**: Updated all tool handlers to use Zod schema validation
- Improved error handling with consistent error response format
- Enhanced type safety with proper TypeScript types and `as const` assertions

### Added - Dependencies

- `zod: ^3.22.4` for runtime schema validation and TypeScript type generation

### Technical Improvements

- Modern MCP TypeScript SDK compliance following latest best practices
- Automatic tool discovery and registration via SDK
- Runtime input validation with descriptive error messages
- Cleaner code structure with individual tool registration
- Better maintainability for adding/modifying tools

### Fixed

- TypeScript compilation errors with proper MCP response types
- Consistent error handling across all tools
- Proper type assertions for MCP content responses

## [1.1.0] - Previous Release

### Added

- Initial MCP server implementation with 18 core Trello tools
- Board and workspace management
- Card CRUD operations
- List management
- Activity tracking
- Image attachment support
- Configuration persistence

### Features

- Support for multiple boards and workspaces
- Rate limiting for Trello API compliance
- Markdown formatting for card details
- Environment variable configuration
- Docker support

---

## Migration Guide for v1.2.0

### For Users

- No breaking changes for end users
- All existing tools continue to work as before
- New checklist tools are available immediately
- Improved error messages and validation

### For Developers

- The internal architecture has been modernized but the external API remains the same
- If extending the server, use the new `registerTool()` pattern with Zod schemas
- See `CHECKLIST_TOOLS.md` for examples of the new implementation pattern

### New Capabilities

- Full checklist lifecycle management
- Advanced search capabilities across checklists
- Completion tracking and progress monitoring
- Seamless integration with existing card and board tools
