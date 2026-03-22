package com.apicgen.bridge;

import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import com.apicgen.validator.ApiValidator;
import com.apicgen.validator.ValidationAnalyzer;
import com.apicgen.validator.ValidationError;
import com.apicgen.validator.ValidationFixer;
import com.apicgen.validator.ValidationResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 为 Web UI / IDEA 插件 / 浏览器插件提供统一的 core 分析与修复入口。
 * Web 层只负责交互与展示，问题判断与修复统一收敛到 core。
 */
public class UiDocumentService {

    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());
    private static final Pattern API_INDEX_PATTERN = Pattern.compile("^apis\\[(\\d+)](?:\\.(.+))?$");
    private static final Pattern API_NAME_PATTERN = Pattern.compile("^api\\.([^.]+)(?:\\.(.+))?$");

    public AnalysisResponse analyze(String yamlContent) throws IOException {
        String sourceFormat = detectSourceFormat(yamlContent);

        try {
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);
            AnalysisContext context = analyzeInternal(yamlContent, sourceFormat, apiDefinition);
            return new AnalysisResponse(
                UiBridgeContract.BRIDGE_NAME,
                UiBridgeContract.CONTRACT_VERSION,
                UiBridgeContract.COMMAND_ANALYZE,
                sourceFormat,
                sourceFormat,
                UiBridgeContract.FORMAT_CUSTOM,
                context.issues(),
                context.normalizedYaml()
            );
        } catch (Exception e) {
            return new AnalysisResponse(
                UiBridgeContract.BRIDGE_NAME,
                UiBridgeContract.CONTRACT_VERSION,
                UiBridgeContract.COMMAND_ANALYZE,
                sourceFormat,
                sourceFormat,
                sourceFormat,
                List.of(
                    new UiIssue(
                        "error",
                        normalizeMessage(e),
                        0,
                        "",
                        "",
                        "DFX-019: YAML 语法 - YAML 格式解析失败",
                        "DFX-019",
                        buildIssueKey("error", "DFX-019: YAML 语法 - YAML 格式解析失败", "", "", normalizeMessage(e)),
                        false,
                        null
                    )
                ),
                yamlContent
            );
        }
    }

    public FixResponse fix(String yamlContent, List<String> selectedIssueKeys) throws IOException {
        String sourceFormat = detectSourceFormat(yamlContent);

        try {
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);
            AnalysisContext context = analyzeInternal(yamlContent, sourceFormat, apiDefinition);

            Set<String> selectedKeys = new LinkedHashSet<>();
            if (selectedIssueKeys != null) {
                selectedKeys.addAll(selectedIssueKeys);
            }
            if (selectedKeys.isEmpty()) {
                context.issues().stream()
                    .filter(UiIssue::fixable)
                    .map(UiIssue::key)
                    .forEach(selectedKeys::add);
            }

            List<ValidationAnalyzer.AnalysisItem> selectedAnalysisItems = new ArrayList<>();
            boolean requiresNormalizationOutput = false;

            for (String key : selectedKeys) {
                ValidationAnalyzer.AnalysisItem item = context.analysisItemsByKey().get(key);
                if (item != null) {
                    selectedAnalysisItems.add(item);
                }
                if (context.normalizationIssueKeys().contains(key)) {
                    requiresNormalizationOutput = true;
                }
            }

            String fixedYaml = yamlContent;
            if (!selectedAnalysisItems.isEmpty() || requiresNormalizationOutput) {
                fixedYaml = new ValidationFixer().fix(apiDefinition, selectedAnalysisItems);
            }

            AnalysisResponse analysisAfterFix = analyze(fixedYaml);
            int fixedCount = selectedAnalysisItems.size() + (requiresNormalizationOutput ? 1 : 0);
            return new FixResponse(
                UiBridgeContract.BRIDGE_NAME,
                UiBridgeContract.CONTRACT_VERSION,
                UiBridgeContract.COMMAND_FIX,
                sourceFormat,
                sourceFormat,
                detectSourceFormat(fixedYaml),
                analysisAfterFix.issues(),
                fixedYaml,
                fixedCount
            );
        } catch (Exception e) {
            AnalysisResponse failed = analyze(yamlContent);
            return new FixResponse(
                UiBridgeContract.BRIDGE_NAME,
                UiBridgeContract.CONTRACT_VERSION,
                UiBridgeContract.COMMAND_FIX,
                sourceFormat,
                sourceFormat,
                sourceFormat,
                failed.issues(),
                yamlContent,
                0
            );
        }
    }

    private AnalysisContext analyzeInternal(String yamlContent, String sourceFormat, ApiDefinition apiDefinition) throws IOException {
        LinkedHashMap<String, UiIssue> issues = new LinkedHashMap<>();
        LinkedHashMap<String, ValidationAnalyzer.AnalysisItem> analysisItemsByKey = new LinkedHashMap<>();
        LinkedHashSet<String> normalizationIssueKeys = new LinkedHashSet<>();

        if ("swagger".equals(sourceFormat)) {
            collectRawSwaggerIssues(yamlContent, issues, normalizationIssueKeys);
        }

        ApiValidator apiValidator = new ApiValidator();
        try {
            ValidationResult validationResult = apiValidator.validate(apiDefinition);
            for (ValidationError error : validationResult.getErrors()) {
                UiIssue issue = toUiIssue(error, apiDefinition, sourceFormat);
                putPreferredIssue(issues, issue);
            }
        } finally {
            apiValidator.cleanup();
        }

        ValidationAnalyzer analyzer = new ValidationAnalyzer();
        for (ValidationAnalyzer.AnalysisItem item : analyzer.analyze(apiDefinition)) {
            UiIssue issue = toUiIssue(item, apiDefinition, sourceFormat);
            putPreferredIssue(issues, issue);
            analysisItemsByKey.putIfAbsent(issue.key(), item);
        }

        String normalizedYaml = new ValidationFixer().fix(apiDefinition, List.of());
        return new AnalysisContext(
            List.copyOf(issues.values()),
            analysisItemsByKey,
            normalizationIssueKeys,
            normalizedYaml
        );
    }

    private void collectRawSwaggerIssues(String yamlContent,
                                         Map<String, UiIssue> issues,
                                         Set<String> normalizationIssueKeys) throws IOException {
        JsonNode root = YAML_MAPPER.readTree(yamlContent);
        if (root == null || !root.has("paths") || !root.get("paths").isObject()) {
            return;
        }

        String basePath = "";
        if (root.has("basePath")) {
            basePath = root.get("basePath").asText("");
        }
        final String effectiveBasePath = basePath;

        JsonNode paths = root.get("paths");
        paths.fieldNames().forEachRemaining(path -> {
            JsonNode pathItem = paths.get(path);
            if (pathItem == null || !pathItem.isObject()) {
                return;
            }

            List<String> methods = List.of("get", "post", "put", "delete", "patch", "options", "head");
            for (String method : methods) {
                if (!pathItem.has(method)) {
                    continue;
                }

                String fullPath = effectiveBasePath + path;
                if (containsDuplicateSeparators(fullPath)) {
                    UiIssue issue = new UiIssue(
                        "error",
                        "路径不能包含重复斜杠: " + fullPath,
                        0,
                        method.toUpperCase(Locale.ROOT) + " " + fullPath,
                        "path",
                        "DFX-001: 路径规范 - 不能包含重复斜杠",
                        "DFX-001",
                        buildIssueKey("error", "DFX-001: 路径规范 - 不能包含重复斜杠",
                            method.toUpperCase(Locale.ROOT) + " " + fullPath, "path", "路径不能包含重复斜杠: " + fullPath),
                        true,
                        new UiLocator(
                            "swagger-path",
                            "",
                            path,
                            method.toUpperCase(Locale.ROOT),
                            "",
                            "",
                            "",
                            "path"
                        )
                    );
                    putPreferredIssue(issues, issue);
                    normalizationIssueKeys.add(issue.key());
                }
            }
        });
    }

    private void putPreferredIssue(Map<String, UiIssue> issues, UiIssue candidate) {
        String logicalKey = buildLogicalIssueKey(candidate);
        UiIssue existing = issues.get(logicalKey);
        if (existing == null) {
            issues.put(logicalKey, candidate);
            return;
        }

        if (shouldReplaceIssue(existing, candidate)) {
            issues.put(logicalKey, candidate);
        }
    }

    private boolean shouldReplaceIssue(UiIssue existing, UiIssue candidate) {
        if (candidate.fixable() && !existing.fixable()) {
            return true;
        }
        if (!existing.fixable() && !isBlank(candidate.api()) && isBlank(existing.api())) {
            return true;
        }
        if (isBlank(existing.ruleCode()) && !isBlank(candidate.ruleCode())) {
            return true;
        }
        return false;
    }

    private String buildLogicalIssueKey(UiIssue issue) {
        if (issue == null) {
            return "";
        }

        UiLocator locator = issue.locator();
        if (locator == null) {
            return issue.key();
        }

        return String.join("|",
            nullSafe(issue.severity()),
            nullSafe(issue.ruleCode()),
            nullSafe(locator.kind()),
            nullSafe(locator.apiName()),
            nullSafe(locator.path()),
            nullSafe(locator.method()),
            nullSafe(locator.section()),
            nullSafe(locator.className()),
            nullSafe(locator.fieldName()),
            nullSafe(locator.property())
        );
    }

    private boolean isBlank(String text) {
        return text == null || text.isBlank();
    }

    private String nullSafe(String text) {
        return text == null ? "" : text;
    }

    private boolean containsDuplicateSeparators(String path) {
        return path != null && (path.contains("//") || path.contains("\\"));
    }

    private UiIssue toUiIssue(ValidationError error, ApiDefinition apiDefinition, String sourceFormat) {
        String message = error.getMessage();
        String field = error.getField() == null ? "" : error.getField();
        String rule = defaultRule(message, "error");
        return new UiIssue(
            "error",
            message,
            0,
            "",
            field,
            rule,
            UiBridgeContract.extractRuleCode(rule, message),
            buildIssueKey("error", rule, "", field, message),
            false,
            buildValidationLocator(error, apiDefinition, sourceFormat)
        );
    }

    private UiIssue toUiIssue(ValidationAnalyzer.AnalysisItem item, ApiDefinition apiDefinition, String sourceFormat) {
        String severity = switch (item.getSeverity()) {
            case ERROR -> "error";
            case WARNING -> "warn";
            case INFO -> "info";
        };

        String api = item.getApiName() == null ? "" : item.getApiName();
        String field = buildFieldPath(item);
        String message = item.getIssue();
        String rule = defaultRule(message, severity);

        return new UiIssue(
            severity,
            message,
            0,
            api,
            field,
            rule,
            UiBridgeContract.extractRuleCode(rule, message),
            buildIssueKey(severity, rule, api, field, message),
            true,
            buildAnalysisLocator(item, apiDefinition, sourceFormat)
        );
    }

    private UiLocator buildAnalysisLocator(ValidationAnalyzer.AnalysisItem item,
                                           ApiDefinition apiDefinition,
                                           String sourceFormat) {
        ApiDefinitionLocator locator = resolveApiByName(apiDefinition, item.getApiName());
        String kind = "swagger".equals(sourceFormat) ? "swagger-field" : "custom-field";
        return new UiLocator(
            kind,
            item.getApiName() == null ? "" : item.getApiName(),
            locator.path(),
            locator.method(),
            item.getLocation() == null ? "" : item.getLocation(),
            item.getClassName() == null ? "" : item.getClassName(),
            item.getFieldName() == null ? "" : item.getFieldName(),
            "validation"
        );
    }

    private UiLocator buildValidationLocator(ValidationError error,
                                             ApiDefinition apiDefinition,
                                             String sourceFormat) {
        if (error == null || error.getField() == null || error.getField().isBlank()) {
            return null;
        }

        String fieldPath = error.getField().trim();
        Matcher apiIndexMatcher = API_INDEX_PATTERN.matcher(fieldPath);
        if (apiIndexMatcher.matches()) {
            int apiIndex = Integer.parseInt(apiIndexMatcher.group(1));
            ApiDefinitionLocator locator = resolveApiByIndex(apiDefinition, apiIndex);
            if (locator == null) {
                return null;
            }

            String remainder = apiIndexMatcher.group(2) == null ? "" : apiIndexMatcher.group(2);
            return buildIndexedValidationLocator(locator, sourceFormat, remainder);
        }

        Matcher apiNameMatcher = API_NAME_PATTERN.matcher(fieldPath);
        if (apiNameMatcher.matches()) {
            String apiName = apiNameMatcher.group(1);
            String remainder = apiNameMatcher.group(2) == null ? "" : apiNameMatcher.group(2);
            if (remainder.contains("Annotations")) {
                return null;
            }

            ApiDefinitionLocator locator = resolveApiByName(apiDefinition, apiName);
            return new UiLocator(
                "swagger".equals(sourceFormat) ? "swagger-api" : "custom-api",
                apiName,
                locator.path(),
                locator.method(),
                "",
                "",
                "",
                normalizeProperty(remainder)
            );
        }

        return null;
    }

    private UiLocator buildIndexedValidationLocator(ApiDefinitionLocator locator,
                                                    String sourceFormat,
                                                    String remainder) {
        String[] segments = remainder == null || remainder.isBlank() ? new String[0] : remainder.split("\\.");
        String section = segments.length > 0 ? segments[0] : "";
        if (section.isBlank()) {
            return new UiLocator(
                "swagger".equals(sourceFormat) ? "swagger-api" : "custom-api",
                locator.apiName(),
                locator.path(),
                locator.method(),
                "",
                "",
                "",
                ""
            );
        }

        if ("path".equals(section) || "method".equals(section) || "name".equals(section)) {
            return new UiLocator(
                "swagger".equals(sourceFormat) ? "swagger-api" : "custom-api",
                locator.apiName(),
                locator.path(),
                locator.method(),
                "",
                "",
                "",
                section
            );
        }

        if (!"request".equals(section) && !"response".equals(section)) {
            return null;
        }

        ApiSectionLocator sectionLocator = "request".equals(section) ? locator.request() : locator.response();
        if (sectionLocator == null) {
            return null;
        }

        if (segments.length == 1) {
            return new UiLocator(
                "swagger".equals(sourceFormat) ? "swagger-api" : "custom-api",
                locator.apiName(),
                locator.path(),
                locator.method(),
                section,
                sectionLocator.className(),
                "",
                section
            );
        }

        if ("className".equals(segments[1])) {
            return new UiLocator(
                "swagger".equals(sourceFormat) ? "swagger-api" : "custom-api",
                locator.apiName(),
                locator.path(),
                locator.method(),
                section,
                sectionLocator.className(),
                "",
                "className"
            );
        }

        if (segments[1].startsWith("fields[")) {
            int fieldIndex = parseIndexedSegment(segments[1], "fields");
            if (fieldIndex < 0 || fieldIndex >= sectionLocator.fieldNames().size()) {
                return null;
            }

            String property = segments.length > 2
                ? normalizeProperty(String.join(".", Arrays.asList(segments).subList(2, segments.length)))
                : "field";

            return new UiLocator(
                "swagger".equals(sourceFormat) ? "swagger-field" : "custom-field",
                locator.apiName(),
                locator.path(),
                locator.method(),
                section,
                sectionLocator.className(),
                sectionLocator.fieldNames().get(fieldIndex),
                property
            );
        }

        return new UiLocator(
            "swagger".equals(sourceFormat) ? "swagger-api" : "custom-api",
            locator.apiName(),
            locator.path(),
            locator.method(),
            section,
            sectionLocator.className(),
            "",
            normalizeProperty(String.join(".", Arrays.asList(segments).subList(1, segments.length)))
        );
    }

    private int parseIndexedSegment(String segment, String expectedPrefix) {
        if (segment == null || !segment.startsWith(expectedPrefix + "[")) {
            return -1;
        }
        int end = segment.indexOf(']');
        if (end < 0) {
            return -1;
        }
        try {
            return Integer.parseInt(segment.substring(expectedPrefix.length() + 1, end));
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private String normalizeProperty(String property) {
        if (property == null || property.isBlank()) {
            return "";
        }
        if (property.startsWith("validation")) {
            return "validation";
        }
        return property;
    }

    private ApiDefinitionLocator resolveApiByName(ApiDefinition apiDefinition, String apiName) {
        if (apiDefinition == null || apiDefinition.getApis() == null || apiName == null || apiName.isBlank()) {
            return ApiDefinitionLocator.empty(apiName == null ? "" : apiName);
        }

        for (com.apicgen.model.Api api : apiDefinition.getApis()) {
            if (apiName.equals(api.getName())) {
                return ApiDefinitionLocator.fromApi(api);
            }
        }
        return ApiDefinitionLocator.empty(apiName);
    }

    private ApiDefinitionLocator resolveApiByIndex(ApiDefinition apiDefinition, int apiIndex) {
        if (apiDefinition == null || apiDefinition.getApis() == null || apiIndex < 0 || apiIndex >= apiDefinition.getApis().size()) {
            return null;
        }
        return ApiDefinitionLocator.fromApi(apiDefinition.getApis().get(apiIndex));
    }

    private String buildFieldPath(ValidationAnalyzer.AnalysisItem item) {
        StringBuilder path = new StringBuilder();
        if (item.getLocation() != null && !item.getLocation().isBlank()) {
            path.append(item.getLocation());
        }
        if (item.getClassName() != null && !item.getClassName().isBlank()) {
            if (path.length() > 0) {
                path.append('.');
            }
            path.append(item.getClassName());
        }
        if (item.getFieldName() != null && !item.getFieldName().isBlank()) {
            if (path.length() > 0) {
                path.append('.');
            }
            path.append(item.getFieldName());
        }
        return path.toString();
    }

    private String detectSourceFormat(String yamlContent) {
        if (yamlContent == null) {
            return "custom";
        }
        String lower = yamlContent.toLowerCase(Locale.ROOT);
        if (lower.contains("swagger:") || lower.contains("openapi:") ||
            (lower.contains("info:") && lower.contains("paths:"))) {
            return "swagger";
        }
        return "custom";
    }

    private String normalizeMessage(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return "YAML 解析错误";
        }
        return message.replace('\r', ' ').trim();
    }

    private String defaultRule(String message, String severity) {
        if (message == null) {
            return "建议优化";
        }
        if (message.contains("路径不能包含重复斜杠")) return "DFX-001: 路径规范 - 不能包含重复斜杠";
        if (message.contains("路径必须以 / 开头")) return "DFX-002: 路径规范 - 必须以 / 开头";
        if (message.contains("必填字段缺少 @NotNull") || message.contains("必填参数") && message.contains("@NotNull")) {
            return "DFX-003: 必填校验 - required=true 必须添加 notNull";
        }
        if (message.contains("String 字段缺少")) return "DFX-004: 字符串校验 - String 类型需添加长度或格式校验";
        if (message.contains("邮箱字段")) return "DFX-005: 邮箱校验 - email 类型字段需添加 @Email";
        if (message.contains("电话字段")) return "DFX-006: 电话校验 - 电话字段需添加正则 ^1[3-9]\\d{9}$";
        if (message.contains("数值字段缺少范围") || message.contains("缺少范围校验")) return "DFX-007: 数值校验 - 数值类型需添加 min/max 范围";
        if (message.contains("List 字段缺少大小")) return "DFX-008: 集合校验 - List 类型需添加 minSize/maxSize";
        if (message.contains("minLength") && message.contains("maxLength")) return "DFX-009: 校验规则 - minLength 不能超过 maxLength";
        if (message.contains("minimum") && message.contains("maximum")) return "DFX-010: 校验规则 - minimum 不能超过 maximum";
        if ((message.contains("min") && message.contains("max")) ||
            message.contains("max 必须大于 min") ||
            message.contains("min 不能大于 max")) return "DFX-010: 校验规则 - min 不能大于 max";
        if (message.contains("minSize") && message.contains("maxSize")) return "DFX-011: 校验规则 - minSize 不能超过 maxSize";
        if ("error".equals(severity)) return "规则验证失败";
        return "建议优化";
    }

    private static String buildIssueKey(String severity, String rule, String api, String field, String message) {
        return String.join("|",
            severity == null ? "" : severity,
            rule == null ? "" : rule,
            api == null ? "" : api,
            field == null ? "" : field,
            message == null ? "" : message
        );
    }

    private record AnalysisContext(
        List<UiIssue> issues,
        Map<String, ValidationAnalyzer.AnalysisItem> analysisItemsByKey,
        Set<String> normalizationIssueKeys,
        String normalizedYaml
    ) {
    }

    public record UiIssue(
        String severity,
        String message,
        int line,
        String api,
        String field,
        String rule,
        String ruleCode,
        String key,
        boolean fixable,
        UiLocator locator
    ) {
    }

    public record UiLocator(
        String kind,
        String apiName,
        String path,
        String method,
        String section,
        String className,
        String fieldName,
        String property
    ) {
    }

    private record ApiSectionLocator(String className, List<String> fieldNames) {
        static ApiSectionLocator fromClass(com.apicgen.model.ClassDefinition definition) {
            if (definition == null) {
                return null;
            }
            List<String> fieldNames = new ArrayList<>();
            if (definition.getFields() != null) {
                definition.getFields().forEach(field -> fieldNames.add(field.getName() == null ? "" : field.getName()));
            }
            return new ApiSectionLocator(
                definition.getClassName() == null ? "" : definition.getClassName(),
                List.copyOf(fieldNames)
            );
        }
    }

    private record ApiDefinitionLocator(
        String apiName,
        String path,
        String method,
        ApiSectionLocator request,
        ApiSectionLocator response
    ) {
        static ApiDefinitionLocator fromApi(com.apicgen.model.Api api) {
            if (api == null) {
                return empty("");
            }
            return new ApiDefinitionLocator(
                api.getName() == null ? "" : api.getName(),
                api.getPath() == null ? "" : api.getPath(),
                api.getMethod() == null ? "" : api.getMethod().name(),
                ApiSectionLocator.fromClass(api.getRequest()),
                ApiSectionLocator.fromClass(api.getResponse())
            );
        }

        static ApiDefinitionLocator empty(String apiName) {
            return new ApiDefinitionLocator(apiName == null ? "" : apiName, "", "", null, null);
        }
    }

    public record AnalysisResponse(
        String bridge,
        int contractVersion,
        String command,
        String sourceFormat,
        String inputFormat,
        String outputFormat,
        List<UiIssue> issues,
        String normalizedYaml
    ) {
    }

    public record FixResponse(
        String bridge,
        int contractVersion,
        String command,
        String sourceFormat,
        String inputFormat,
        String outputFormat,
        List<UiIssue> issues,
        String fixedYaml,
        int fixedCount
    ) {
    }
}
