# Epics

## Epic 1: Skill Packaging Core

### Story 1.1: Initialize Skill Directory Structure
Create the skill directory (`skill-trello-mcp`) and necessary subfolders (`scripts`).

### Story 1.2: Create SKILL.md Workflow
Draft the `SKILL.md` entry point. It must include an activation step to verify if the MCP server is installed and instruct the agent to execute the install script if it is the first run.

### Story 1.3: Bundle Install Script
Create `scripts/install.sh` inside the skill directory. This script will install dependencies, build the server, and handle any local MCP configuration if necessary.

### Story 1.4: Update Documentation
Modify the root `README.md` to remove old standalone installation instructions and clarify that the repository provides a BMAD-compatible skill package.
