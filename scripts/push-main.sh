#!/usr/bin/env bash
set -euo pipefail

for attempt in 1 2 3; do
  echo "Fetching the latest main branch (attempt ${attempt}/3)"
  git fetch origin main

  if ! git rebase FETCH_HEAD; then
    git rebase --abort || true
    echo "Could not rebase the update onto origin/main; leaving the remote unchanged." >&2
    exit 1
  fi

  if git push origin HEAD:main; then
    exit 0
  fi

  if [ "$attempt" -lt 3 ]; then
    sleep "$attempt"
  fi
done

echo "Could not push to origin/main after 3 attempts." >&2
exit 1
