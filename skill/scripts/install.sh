#!/usr/bin/env bash
# Trello MCP Skill Installation Script

set -e

echo "Installing Trello MCP Skill..."

# Get the directory of the script and navigate to the project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../.."

cd "$PROJECT_ROOT"

# Check if bun is installed, fallback to npm
if command -v bun &> /dev/null; then
    echo "Bun detected. Installing dependencies with bun..."
    bun install
    echo "Building project..."
    bun run build
else
    echo "Bun not found, using npm..."
    npm install
    echo "Building project..."
    npm run build
fi

# Set up environment file if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.template ]; then
        cp .env.template .env
        echo "Created .env from .env.template. Please remember to fill in your TRELLO_API_KEY and TRELLO_TOKEN."
    else
        echo "Warning: .env.template not found. Please create a .env file manually."
    fi
else
    echo ".env file already exists."
fi

echo "Trello MCP Skill installed successfully!"
