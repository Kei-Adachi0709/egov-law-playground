#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "package.json" ]; then
  echo "This script must be run from the project root." >&2
  exit 1
fi

npm install

npm run format
npm run lint || npm run lint -- --fix
npm run build
npm run test

if [ ! -d .git ]; then
  git init
fi

git add .
if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "chore: initial setup"
fi
