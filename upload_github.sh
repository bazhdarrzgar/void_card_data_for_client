#!/bin/bash

# Ensure we are in a git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: Not a git repository!"
  exit 1
fi

# Get the current branch name
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "main")

echo "====================================="
echo "🚀 Git Upload Script"
echo "Active Branch: $BRANCH"
echo "====================================="

# Prompt for the commit message
read -p "Enter commit message: " COMMIT_MSG

# If the commit message is empty, use a default date-based message
if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="Update $(date '+%Y-%m-%d %H:%M:%S')"
  echo "⚠️ No commit message entered. Using default: '$COMMIT_MSG'"
fi

# Stage all changes (following .gitignore rules)
echo "📦 Staging changes..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

# Push to origin
echo "📤 Pushing to GitHub (origin $BRANCH)..."
git push origin "$BRANCH"

if [ $? -eq 0 ]; then
  echo "✅ Successfully uploaded to GitHub!"
else
  echo "❌ Failed to push. Please check the logs above."
  exit 1
fi
