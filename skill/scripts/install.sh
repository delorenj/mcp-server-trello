#!/usr/bin/env bash
# Trello MCP Skill Installation Script

set -e

echo "Installing Trello MCP Server..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "Bun is required to install the Trello MCP Server."
    echo "Please install bun (https://bun.sh) or use mise (https://mise.jdx.dev/)."
    exit 1
fi

echo "Installing the Trello MCP Server from the registry..."
bunx -y @smithery/cli install @delorenj/mcp-server-trello --client claude

echo "Trello MCP Server installed successfully!"
echo "Please ensure you have configured your TRELLO_API_KEY and TRELLO_TOKEN in your MCP settings."
