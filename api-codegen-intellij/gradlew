#!/bin/sh

#
# Gradle wrapper script for POSIX-compatible shells
#

# Determine the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Determine the Java command to use
JAVA_HOME="${JAVA_HOME:-${org.gradle.java.home}}"
if [ -z "$JAVA_HOME" ]; then
    JAVA="java"
else
    JAVA="$JAVA_HOME/bin/java"
fi

# Gradle wrapper jar location
WRAPPER_JAR="$SCRIPT_DIR/gradle/wrapper/gradle-wrapper.jar"

# Check if wrapper jar exists
if [ ! -f "$WRAPPER_JAR" ]; then
    echo "Error: gradle-wrapper.jar not found. Please run 'gradle wrapper' first."
    exit 1
fi

# Execute Gradle
exec "$JAVA" $JAVA_OPTS -jar "$WRAPPER_JAR" "$@"
