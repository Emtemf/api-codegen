#!/usr/bin/env bash
# API Codegen runner script
# Wraps Maven plugin invocation with common defaults
#
# Usage:
#   bash run-codegen.sh <command> <yaml> <package> [options]
#
# Commands:
#   analyze  <yaml> <package>       Run DFX analysis only
#   fix      <yaml> <package>       Auto-fix YAML and write back
#   generate <yaml> <package>       Generate Java code
#   webui                           Start Web UI
#
# Options:
#   --framework=spring|cxf          Framework (default: auto-detect)
#   --force                         Force overwrite existing files
#   --company="Name"                Add copyright header
#   --port=18080                    Web UI port (default: 18080)
#   --output=<dir>                  Output directory

set -euo pipefail

CODEGEN_HOME="$(cd "$(dirname "$0")/.." && pwd)"

# Determine Maven command
if [ -f "$CODEGEN_HOME/mvnw" ]; then
  MVN="$CODEGEN_HOME/mvnw"
elif [ -f "$CODEGEN_HOME/mvnw.cmd" ]; then
  MVN="$CODEGEN_HOME/mvnw.cmd"
else
  MVN="mvn"
fi

COMMAND="${1:-help}"
shift || true

# Separate positional args and options
POSITIONAL=()
FRAMEWORK=""
FORCE=""
COMPANY=""
PORT="18080"
OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --framework=*) FRAMEWORK="-Dframework=${1#--framework=}" ; shift ;;
    --force)       FORCE="-Dforce=true" ; shift ;;
    --company=*)   COMPANY="-Dcompany=${1#--company=}" ; shift ;;
    --port=*)      PORT="${1#--port=}" ; shift ;;
    --output=*)    OUTPUT_DIR="-DoutputDir=${1#--output=}" ; shift ;;
    --*)           shift ;;
    *)             POSITIONAL+=("$1") ; shift ;;
  esac
done

case "$COMMAND" in
  analyze)
    YAML="${POSITIONAL[0]:?Usage: run-codegen.sh analyze <yaml> <package>}"
    PKG="${POSITIONAL[1]:?Missing package name}"
    echo ">>> Analyzing $YAML ..."
    "$MVN" com.apicgen:api-codegen-maven-plugin:generate \
      -DyamlFile="$YAML" \
      -DbasePackage="$PKG" \
      -Danalyze=true
    ;;

  fix)
    YAML="${POSITIONAL[0]:?Usage: run-codegen.sh fix <yaml> <package>}"
    PKG="${POSITIONAL[1]:?Missing package name}"
    echo ">>> Auto-fixing $YAML ..."
    "$MVN" com.apicgen:api-codegen-maven-plugin:generate \
      -DyamlFile="$YAML" \
      -DbasePackage="$PKG" \
      -DautoFix=true
    ;;

  generate)
    YAML="${POSITIONAL[0]:?Usage: run-codegen.sh generate <yaml> <package>}"
    PKG="${POSITIONAL[1]:?Missing package name}"
    echo ">>> Generating code from $YAML ..."
    "$MVN" com.apicgen:api-codegen-maven-plugin:generate \
      -DyamlFile="$YAML" \
      -DbasePackage="$PKG" \
      ${OUTPUT_DIR:-} \
      ${FRAMEWORK:-} \
      ${FORCE:-} \
      ${COMPANY:-}
    ;;

  webui)
    echo ">>> Starting Web UI on port $PORT ..."
    cd "$CODEGEN_HOME/web-ui"
    PORT="$PORT" node server.js
    ;;

  help|*)
    echo "Usage: bash run-codegen.sh <command> <yaml> <package> [options]"
    echo ""
    echo "Commands:"
    echo "  analyze  <yaml> <package>       Run DFX analysis only"
    echo "  fix      <yaml> <package>       Auto-fix YAML and write back"
    echo "  generate <yaml> <package>       Generate Java code"
    echo "  webui                           Start Web UI"
    echo ""
    echo "Options:"
    echo "  --framework=spring|cxf          Framework (default: auto-detect)"
    echo "  --force                         Force overwrite existing files"
    echo "  --company=\"Name\"                Add copyright header"
    echo "  --port=18080                    Web UI port"
    echo "  --output=<dir>                  Output directory"
    ;;
esac
