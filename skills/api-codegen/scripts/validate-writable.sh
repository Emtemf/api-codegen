#!/usr/bin/env bash
# Authorization + writability check for fix agent
# Usage: validate-writable.sh <yaml_path> <package> <authorized>
# Exit 0 = authorized and writable, non-zero = denied

set -euo pipefail

YAML_PATH="${1:-}"
PACKAGE="${2:-}"
AUTHORIZED="${3:-false}"

error() { echo "AUTH_ERROR: $1"; exit 1; }

# Run base input validation first
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$SCRIPT_DIR/validate-input.sh" "$YAML_PATH" "$PACKAGE" || exit 1

# Authorization check
[ "$AUTHORIZED" = "true" ] \
  || error "Fix not authorized. User must explicitly confirm before auto-fix (say '修复' or '帮我修')"

# Writable check
[ -w "$YAML_PATH" ] \
  || error "YAML file is not writable: $YAML_PATH"

# Git dirty check (warning only)
GIT_DIR="$(dirname "$YAML_PATH")"
if git -C "$GIT_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
  if ! git -C "$GIT_DIR" diff --quiet "$YAML_PATH" 2>/dev/null; then
    echo "AUTH_WARNING: YAML file has uncommitted changes. Proceeding with backup."
  fi
fi

echo "AUTH_OK: authorized and writable"
