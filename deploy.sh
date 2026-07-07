#!/usr/bin/env bash
# One-command deploy: build bundle, commit, push, purge jsDelivr cache.
# Usage:  ./deploy.sh "what changed"
set -e
cd "$(dirname "$0")"

python3 build-webflow-bundle.py

git add -A
if git diff --cached --quiet; then
  echo "nothing to deploy (no changes)"
  exit 0
fi
git commit -m "${1:-update site}"
git push origin main

# purge exactly the files that changed in this commit
for f in $(git diff-tree --no-commit-id --name-only -r HEAD); do
  curl -s "https://purge.jsdelivr.net/gh/sahil-m-TE/velmont-temp@main/$f" > /dev/null
  echo "purged: $f"
done

echo "LIVE. Give jsDelivr ~1 minute, then hard-refresh the site (Ctrl+Shift+R)."
