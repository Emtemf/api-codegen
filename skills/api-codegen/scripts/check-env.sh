#!/usr/bin/env bash
# API Codegen environment check script
# Usage: bash check-env.sh [CODEGEN_HOME]
# Output: key=value pairs for each check result

set -euo pipefail

CODEGEN_HOME="${1:-.}"

# Helper: check if a command exists
has_cmd() { command -v "$1" &>/dev/null; }

# Helper: detect OS
detect_os() {
  local os="$(uname -s 2>/dev/null || echo unknown)"
  case "$os" in
    Linux*)   echo "linux" ;;
    Darwin*)  echo "macos" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *)        echo "unknown" ;;
  esac
}

echo "=== API Codegen Environment Check ==="

# 1. OS detection
OS=$(detect_os)
echo "os=$OS"

# 2. JDK check
if has_cmd java; then
  JAVA_VERSION=$(java -version 2>&1 | head -1 | grep -oP '\d+' | head -1)
  if [ "$JAVA_VERSION" -ge 21 ] 2>/dev/null; then
    echo "jdk=ok"
    echo "jdk_version=$JAVA_VERSION"
  else
    echo "jdk=wrong_version"
    echo "jdk_version=$JAVA_VERSION"
  fi
else
  echo "jdk=missing"
fi

# 3. Locate CODEGEN_HOME
if [ ! -f "$CODEGEN_HOME/api-codegen-core/pom.xml" ]; then
  echo "codegen_home=not_found"
  echo "codegen_path="
  exit 0
else
  CODEGEN_HOME="$(cd "$CODEGEN_HOME" && pwd)"
  echo "codegen_home=ok"
  echo "codegen_path=$CODEGEN_HOME"
fi

# 4. Maven plugin check
M2_REPO="${HOME}/.m2/repository"
PLUGIN_JAR=$(find "$M2_REPO/com/apicgen/api-codegen-maven-plugin" -name "api-codegen-maven-plugin-*.jar" 2>/dev/null | head -1)
if [ -n "$PLUGIN_JAR" ]; then
  PLUGIN_VERSION=$(basename "$PLUGIN_JAR" | sed 's/api-codegen-maven-plugin-//;s/\.jar//')
  echo "plugin=installed"
  echo "plugin_version=$PLUGIN_VERSION"
else
  echo "plugin=not_installed"
fi

# 5. Maven Wrapper check
if [ -f "$CODEGEN_HOME/mvnw" ]; then
  echo "mvn_wrapper=ok"
elif [ -f "$CODEGEN_HOME/mvnw.cmd" ]; then
  echo "mvn_wrapper=ok"
else
  echo "mvn_wrapper=missing"
fi

# 6. Maven command check (for usage mode outside api-codegen)
if has_cmd mvn; then
  MVN_VERSION=$(mvn --version 2>/dev/null | head -1 | grep -oP '\d+\.\d+\.\d+' | head -1)
  echo "mvn=ok"
  echo "mvn_version=$MVN_VERSION"
else
  echo "mvn=not_installed"
fi

# 7. Source code version check
if [ -d "$CODEGEN_HOME/.git" ]; then
  DIRTY=$(git -C "$CODEGEN_HOME" status --short 2>/dev/null | head -1)
  if [ -n "$DIRTY" ]; then
    echo "source_stale=true"
  else
    echo "source_stale=false"
  fi
else
  echo "source_stale=unknown"
fi

# 8. Node.js check (Web UI)
if has_cmd node; then
  NODE_VERSION=$(node --version 2>/dev/null | sed 's/v//')
  echo "node=ok"
  echo "node_version=$NODE_VERSION"
else
  echo "node=missing"
fi

# 9. Web UI dependencies check
if [ -f "$CODEGEN_HOME/web-ui/node_modules/.package-lock.json" ]; then
  echo "webui_deps=ok"
else
  echo "webui_deps=missing"
fi

echo "=== Check Complete ==="
