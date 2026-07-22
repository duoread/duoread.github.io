#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${REPO_DIR:-/root/aicode/multi_language}"
RUN_ROOT="${RUN_ROOT:-/root/aicode/runs/multi_language}"
LOG_DIR="${LOG_DIR:-$RUN_ROOT/logs}"
LOCK_FILE="$RUN_ROOT/economist-sync.lock"
GIT_REMOTE="${GIT_REMOTE:-duoread}"

mkdir -p "$LOG_DIR"
exec >>"$LOG_DIR/economist-sync-$(date +%F).log" 2>&1

echo "[$(date --iso-8601=seconds)] Starting magazine sync"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date --iso-8601=seconds)] Another sync is running; exiting"
  exit 0
fi

cd "$REPO_DIR"

if git status --porcelain | grep -q .; then
  echo "[$(date --iso-8601=seconds)] Working tree has local changes; continuing without pulling"
else
  git fetch "$GIT_REMOTE" source main
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  if [ "$current_branch" != "source" ]; then
    git switch source 2>/dev/null || git switch -c source --track "$GIT_REMOTE/source"
  fi
  git pull --ff-only "$GIT_REMOTE" source
fi

install_deps="${MAGAZINE_INSTALL_DEPS:-auto}"
case "$install_deps" in
  always)
    echo "[$(date --iso-8601=seconds)] Installing dependencies (MAGAZINE_INSTALL_DEPS=always)"
    npm ci --no-audit --no-fund
    ;;
  never)
    echo "[$(date --iso-8601=seconds)] Skipping dependency install (MAGAZINE_INSTALL_DEPS=never)"
    ;;
  auto)
    if [ ! -d node_modules ] || [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
      echo "[$(date --iso-8601=seconds)] Installing dependencies (node_modules missing or package-lock changed)"
      npm ci --no-audit --no-fund
    else
      echo "[$(date --iso-8601=seconds)] Dependencies already installed; skipping npm ci"
    fi
    ;;
  *)
    echo "[$(date --iso-8601=seconds)] Unsupported MAGAZINE_INSTALL_DEPS=$install_deps; use auto, always, or never" >&2
    exit 1
    ;;
esac

RUN_ROOT="$RUN_ROOT" \
TRANSLATION_PROVIDER="${TRANSLATION_PROVIDER:-codex}" \
CODEX_TRANSLATION_MODEL="${CODEX_TRANSLATION_MODEL:-gpt-5.3-codex-spark}" \
CODEX_TRANSLATION_REASONING="${CODEX_TRANSLATION_REASONING:-low}" \
TRANSLATION_CHUNK_SIZE="${TRANSLATION_CHUNK_SIZE:-4}" \
node scripts/sync-latest-magazines.mjs \
  --publish true \
  --remote "$GIT_REMOTE" \
  --backfill "${MAGAZINE_BACKFILL:-true}"

echo "[$(date --iso-8601=seconds)] Magazine sync finished"
