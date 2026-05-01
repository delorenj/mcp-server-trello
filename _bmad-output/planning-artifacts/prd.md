---
stepsCompleted: [1]
---
# Product Requirements Document: Skill Packaging for Trello MCP Server

## 1. Problem Statement
The repository is currently a standalone MCP server. The community is moving towards packaging these servers as "skills" that contain the MCP server tools along with the workflow instructions. We need to transition this repository into a skill-based package.

## 2. Target Audience
- Existing and new users of the Trello MCP Server.
- AI Agents that need to understand how to use the Trello MCP Server tools via skill instructions.

## 3. Product Features & Requirements

### 3.1. Skill Structure
- **Requirement:** The repository must contain a `skill` folder (or equivalent structure) that encapsulates the skill.
- **Requirement:** The skill must include a `SKILL.md` entry file that provides the workflow instructions.

### 3.2. First-Run Installation
- **Requirement:** The skill must bundle an install script at `skill/scripts/install.sh`.
- **Requirement:** When the skill is first initialized or checked out, the `SKILL.md` workflow must instruct the agent to run the `install.sh` script to set up the MCP server.

### 3.3. Agent Workflow
- **Requirement:** `SKILL.md` must clearly explain how to use the Trello MCP server tools once they are installed.

### 3.4. Documentation
- **Requirement:** Remove the standalone MCP server installation instructions from `README.md`, as the user knows how to install a skill. Note that this is a BMAD skill package.

## 4. Non-Functional Requirements
- **Maintainability:** The script and skill must be easy to read and modify.
- **Automation:** The installation process should run headless or with minimal prompts where possible.
