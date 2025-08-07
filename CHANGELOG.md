# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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