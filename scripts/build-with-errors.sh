#!/usr/bin/env zsh

# Script to build the project and capture error output

echo "🔄 Building project with error capture..."

# Change to project directory
cd "$(dirname "$0")/.." || exit 1

# Attempt to build with error output redirected to file
npm run build > /tmp/build-output.txt 2>&1

# Check if build succeeded
if [ $? -eq 0 ]; then
  echo "✅ Build succeeded!"
else
  echo "❌ Build failed! Error output:"
  cat /tmp/build-output.txt
fi