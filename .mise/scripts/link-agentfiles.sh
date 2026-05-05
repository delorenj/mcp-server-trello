#!/bin/bash

if [ -f AGENTS.md ]; then
  ln -sf AGENTS.md CLAUDE.md
  ln -sf AGENTS.md GEMINI.md
  echo "✅ AI agent symlinks verified"
else
  echo "No AGENTS.md file found. Can't symlink."
fi
