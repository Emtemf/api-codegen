package com.apicgen.bridge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * UI / IDEA / 浏览器插件共用的 bridge contract 常量与辅助逻辑。
 */
public final class UiBridgeContract {

    private static final String RESOURCE_PATH = "/ui-bridge-contract.json";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final ContractMetadata METADATA = loadMetadata();

    public static final String BRIDGE_NAME = METADATA.bridgeName();
    public static final int CONTRACT_VERSION = METADATA.contractVersion();

    public static final String COMMAND_ANALYZE = METADATA.analyzeCommand();
    public static final String COMMAND_FIX = METADATA.fixCommand();

    public static final String FORMAT_CUSTOM = METADATA.customFormat();
    public static final String FORMAT_SWAGGER = METADATA.swaggerFormat();

    private static final Pattern RULE_CODE_PATTERN = Pattern.compile("(DFX-\\d+)");

    private UiBridgeContract() {
    }

    public static String extractRuleCode(String rule, String message) {
        String code = extractFirst(rule);
        if (!code.isBlank()) {
            return code;
        }
        return extractFirst(message);
    }

    static ContractMetadata metadata() {
        return METADATA;
    }

    private static String extractFirst(String text) {
        if (text == null || text.isBlank()) {
            return "";
        }
        Matcher matcher = RULE_CODE_PATTERN.matcher(text);
        return matcher.find() ? matcher.group(1) : "";
    }

    private static ContractMetadata loadMetadata() {
        try (InputStream stream = UiBridgeContract.class.getResourceAsStream(RESOURCE_PATH)) {
            if (stream == null) {
                throw new IllegalStateException("Missing bridge contract resource: " + RESOURCE_PATH);
            }

            JsonNode contract = JSON.readTree(stream);
            return new ContractMetadata(
                requiredText(contract, "bridge"),
                requiredInt(contract, "contractVersion"),
                requiredText(contract.path("commands"), "analyze"),
                requiredText(contract.path("commands"), "fix"),
                requiredText(contract.path("formats"), "custom"),
                requiredText(contract.path("formats"), "swagger")
            );
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load bridge contract resource", e);
        }
    }

    private static String requiredText(JsonNode node, String fieldName) {
        String value = node.path(fieldName).asText("");
        if (value.isBlank()) {
            throw new IllegalStateException("Missing bridge contract field: " + fieldName);
        }
        return value;
    }

    private static int requiredInt(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (!value.canConvertToInt()) {
            throw new IllegalStateException("Missing bridge contract field: " + fieldName);
        }
        return value.asInt();
    }

    record ContractMetadata(
        String bridgeName,
        int contractVersion,
        String analyzeCommand,
        String fixCommand,
        String customFormat,
        String swaggerFormat
    ) {
    }
}
