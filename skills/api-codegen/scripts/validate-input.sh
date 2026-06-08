#!/usr/bin/env bash
# Input validation for api-codegen agents
# Usage: validate-input.sh <yaml_path> <package> [output_path]
# Exit 0 = valid, non-zero = invalid (error message on stdout)

set -euo pipefail

YAML_PATH="${1:-}"
PACKAGE="${2:-}"
OUTPUT_PATH="${3:-}"

error() { echo "VALIDATION_ERROR: $1"; exit 1; }

# YAML file check
[ -n "$YAML_PATH" ] || error "yaml_path is required"
[ -f "$YAML_PATH" ] || error "YAML file not found: $YAML_PATH"
[ -r "$YAML_PATH" ] || error "YAML file is not readable: $YAML_PATH"

# Package name format
[ -n "$PACKAGE" ] || error "package is required"
echo "$PACKAGE" | grep -qE '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$' \
  || error "Invalid package name format: $PACKAGE (expected: com.example.demo)"

# Output path check (if provided)
if [ -n "$OUTPUT_PATH" ]; then
  OUTPUT_DIR="$(dirname "$OUTPUT_PATH")"
  [ -d "$OUTPUT_DIR" ] || error "Output directory does not exist: $OUTPUT_DIR"
  [ -w "$OUTPUT_DIR" ] || error "Output directory is not writable: $OUTPUT_DIR"
fi

echo "VALIDATION_OK: all inputs valid"
