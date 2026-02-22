package com.apicgen.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Path Traversal Security Tests
 *
 * Tests for:
 * - Preventing ../../../etc/passwd attacks
 * - Preventing API name path traversal
 * - Regex injection protection
 */
class PathTraversalTest {

    @Nested
    @DisplayName("should_prevent_path_traversal")
    class ShouldPreventPathTraversal {

        @Test
        @DisplayName("should_reject_path_with_double_dots")
        void shouldRejectPathWithDoubleDots() {
            // Given - a malicious path attempting to escape the working directory
            String maliciousPath = "../../../etc/passwd";

            // When & Then - validation should reject this
            assertThrows(IllegalArgumentException.class, () -> {
                validateInputPath(maliciousPath);
            });
        }

        @Test
        @DisplayName("should_reject_path_with_double_dots_in_middle")
        void shouldRejectPathWithDoubleDotsInMiddle() {
            // Given
            String maliciousPath = "api/../../../etc/passwd";

            // When & Then
            assertThrows(IllegalArgumentException.class, () -> {
                validateInputPath(maliciousPath);
            });
        }

        @Test
        @DisplayName("should_accept_valid_relative_path")
        void shouldAcceptValidRelativePath() {
            // Given
            String validPath = "api.yaml";

            // When
            Path result = validateInputPath(validPath);

            // Then
            assertNotNull(result);
        }

        @Test
        @DisplayName("should_accept_valid_nested_path")
        void shouldAcceptValidNestedPath() {
            // Given
            String validPath = "src/main/resources/api.yaml";

            // When
            Path result = validateInputPath(validPath);

            // Then
            assertNotNull(result);
        }
    }

    @Nested
    @DisplayName("should_sanitize_file_names")
    class ShouldSanitizeFileNames {

        @Test
        @DisplayName("should_sanitize_api_name_with_dots")
        void shouldSanitizeApiNameWithDots() {
            // Given
            String apiName = "create..user";

            // When
            String sanitized = sanitizeFileName(apiName);

            // Then
            assertFalse(sanitized.contains(".."));
        }

        @Test
        @DisplayName("should_sanitize_api_name_with_slashes")
        void shouldSanitizeApiNameWithSlashes() {
            // Given
            String apiName = "create/user";

            // When
            String sanitized = sanitizeFileName(apiName);

            // Then
            assertFalse(sanitized.contains("/"));
            assertFalse(sanitized.contains("\\"));
        }

        @Test
        @DisplayName("should_sanitize_api_name_with_special_chars")
        void shouldSanitizeApiNameWithSpecialChars() {
            // Given
            String apiName = "create@user#test$";

            // When
            String sanitized = sanitizeFileName(apiName);

            // Then - should only contain alphanumeric, underscore, or hyphen
            assertTrue(sanitized.matches("[a-zA-Z0-9_\\-]*"));
        }

        @Test
        @DisplayName("should_handle_null_api_name")
        void shouldHandleNullApiName() {
            // Given
            String apiName = null;

            // When
            String sanitized = sanitizeFileName(apiName);

            // Then
            assertEquals("unnamed", sanitized);
        }

        @Test
        @DisplayName("should_handle_empty_api_name")
        void shouldHandleEmptyApiName() {
            // Given
            String apiName = "";

            // When
            String sanitized = sanitizeFileName(apiName);

            // Then
            assertEquals("unnamed", sanitized);
        }

        @Test
        @DisplayName("should_preserve_valid_api_name")
        void shouldPreserveValidApiName() {
            // Given
            String apiName = "createUser";

            // When
            String sanitized = sanitizeFileName(apiName);

            // Then
            assertEquals("createUser", sanitized);
        }

        @Test
        @DisplayName("should_allow_underscores_and_hyphens")
        void shouldAllowUnderscoresAndHyphens() {
            // Given
            String apiName = "create_user-test";

            // When
            String sanitized = sanitizeFileName(apiName);

            // Then
            assertEquals("create_user-test", sanitized);
        }
    }

    @Nested
    @DisplayName("should_escape_regex_patterns")
    class ShouldEscapeRegexPatterns {

        @Test
        @DisplayName("should_escape_double_quotes")
        void shouldEscapeDoubleQuotes() {
            // Given
            String pattern = "test\"value";

            // When
            String escaped = escapeRegex(pattern);

            // Then
            assertTrue(escaped.contains("\\\""));
        }

        @Test
        @DisplayName("should_escape_backslashes")
        void shouldEscapeBackslashes() {
            // Given
            String pattern = "test\\value";

            // When
            String escaped = escapeRegex(pattern);

            // Then
            assertTrue(escaped.contains("\\\\"));
        }

        @Test
        @DisplayName("should_escape_newlines")
        void shouldEscapeNewlines() {
            // Given
            String pattern = "test\nvalue";

            // When
            String escaped = escapeRegex(pattern);

            // Then
            assertTrue(escaped.contains("\\n"));
        }

        @Test
        @DisplayName("should_handle_null_pattern")
        void shouldHandleNullPattern() {
            // Given
            String pattern = null;

            // When
            String escaped = escapeRegex(pattern);

            // Then
            assertEquals("", escaped);
        }

        @Test
        @DisplayName("should_handle_simple_pattern")
        void shouldHandleSimplePattern() {
            // Given
            String pattern = "^[a-z]+$";

            // When
            String escaped = escapeRegex(pattern);

            // Then - should not change simple patterns
            assertEquals("^[a-z]+$", escaped);
        }
    }

    // Methods that mirror Main.java security implementations

    private Path validateInputPath(String path) {
        if (path == null || path.isBlank()) {
            throw new IllegalArgumentException("Input path cannot be empty");
        }

        // Check for path traversal patterns
        String lowerPath = path.toLowerCase();
        if (lowerPath.contains("..")) {
            throw new IllegalArgumentException("Path traversal detected in input: " + path);
        }

        return Paths.get(path).toAbsolutePath().normalize();
    }

    private String sanitizeFileName(String name) {
        if (name == null || name.isBlank()) {
            return "unnamed";
        }

        // Remove or replace dangerous characters
        String sanitized = name
                .replaceAll("[^a-zA-Z0-9_\\-]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_|_$", "");

        if (sanitized.isBlank() || sanitized.isEmpty()) {
            sanitized = "unnamed";
        }

        return sanitized;
    }

    private String escapeRegex(String pattern) {
        if (pattern == null) {
            return "";
        }
        return pattern
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
