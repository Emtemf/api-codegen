package com.apicgen.bridge;

import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import com.apicgen.validator.ApiValidator;
import com.apicgen.validator.ValidationAnalyzer;
import com.apicgen.validator.ValidationError;
import com.apicgen.validator.ValidationFixer;
import com.apicgen.validator.ValidationResult;
import com.apicgen.util.ValidationConstants;
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

            Map<String, UiIssue> issuesByKey = new LinkedHashMap<>();
            for (UiIssue issue : context.issues()) {
                issuesByKey.put(issue.key(), issue);
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

            FixComputation fixComputation = "swagger".equals(sourceFormat)
                ? fixSwaggerSourceYaml(yamlContent, selectedKeys, issuesByKey, context.analysisItemsByKey())
                : fixCustomSourceYaml(yamlContent, apiDefinition, selectedAnalysisItems, requiresNormalizationOutput);

            AnalysisResponse analysisAfterFix = analyze(fixComputation.fixedYaml());
            return new FixResponse(
                UiBridgeContract.BRIDGE_NAME,
                UiBridgeContract.CONTRACT_VERSION,
                UiBridgeContract.COMMAND_FIX,
                sourceFormat,
                sourceFormat,
                fixComputation.outputFormat(),
                analysisAfterFix.issues(),
                fixComputation.fixedYaml(),
                fixComputation.fixedCount()
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

    private FixComputation fixCustomSourceYaml(String yamlContent,
                                               ApiDefinition apiDefinition,
                                               List<ValidationAnalyzer.AnalysisItem> selectedAnalysisItems,
                                               boolean requiresNormalizationOutput) {
        String fixedYaml = yamlContent;
        if (!selectedAnalysisItems.isEmpty() || requiresNormalizationOutput) {
            fixedYaml = new ValidationFixer().fix(apiDefinition, selectedAnalysisItems);
        }
        int fixedCount = fixedYaml.equals(yamlContent) ? 0 : selectedAnalysisItems.size() + (requiresNormalizationOutput ? 1 : 0);
        return new FixComputation(fixedYaml, fixedCount, detectSourceFormat(fixedYaml));
    }

    private FixComputation fixSwaggerSourceYaml(String yamlContent,
                                                Set<String> selectedKeys,
                                                Map<String, UiIssue> issuesByKey,
                                                Map<String, ValidationAnalyzer.AnalysisItem> analysisItemsByKey) {
        List<String> lines = new ArrayList<>(Arrays.asList(yamlContent.split("\n", -1)));
        int appliedCount = 0;
        for (String key : selectedKeys) {
            UiIssue issue = issuesByKey.get(key);
            if (issue == null || issue.locator() == null) {
                continue;
            }

            boolean changed;
            if ("DFX-001".equals(issue.ruleCode())) {
                changed = applySwaggerPathFix(lines, issue.locator());
            } else {
                ValidationAnalyzer.AnalysisItem item = analysisItemsByKey.get(key);
                changed = item != null && applySwaggerValidationFix(lines, issue.locator(), item);
            }

            if (changed) {
                appliedCount++;
            }
        }

        if (appliedCount == 0) {
            return new FixComputation(yamlContent, 0, "swagger");
        }

        return new FixComputation(String.join("\n", lines), appliedCount, "swagger");
    }

    private UiIssue recomputeSwaggerFixability(String yamlContent,
                                               UiIssue issue,
                                               ValidationAnalyzer.AnalysisItem item) {
        if (issue == null || !issue.fixable() || issue.locator() == null || item == null) {
            return issue;
        }

        List<String> lines = new ArrayList<>(Arrays.asList(yamlContent.split("\n", -1)));
        boolean fixable = applySwaggerValidationFix(lines, issue.locator(), item);
        if (fixable == issue.fixable()) {
            return issue;
        }

        return new UiIssue(
            issue.severity(),
            issue.message(),
            issue.line(),
            issue.api(),
            issue.field(),
            issue.rule(),
            issue.ruleCode(),
            issue.key(),
            fixable,
            issue.locator()
        );
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
            if ("swagger".equals(sourceFormat)) {
                issue = recomputeSwaggerFixability(yamlContent, issue, item);
            }
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

    private boolean applySwaggerPathFix(List<String> lines, UiLocator locator) {
        int pathLine = findSwaggerPathLine(lines, locator.path(), 0, lines.size());
        if (pathLine < 0) {
            return false;
        }

        String line = lines.get(pathLine);
        String originalPath = extractYamlKey(line.trim());
        if (originalPath == null || originalPath.isBlank()) {
            return false;
        }

        String normalizedPath = normalizeSwaggerPath(originalPath);
        if (normalizedPath.equals(originalPath)) {
            return false;
        }

        lines.set(pathLine, replaceYamlKey(line, originalPath, normalizedPath));
        return true;
    }

    private boolean applySwaggerValidationFix(List<String> lines,
                                              UiLocator locator,
                                              ValidationAnalyzer.AnalysisItem item) {
        // 当缺少类型时，先尝试推断并添加类型行
        if (requiresSwaggerExplicitType(item.getIssue()) && swaggerParameterNeedsManualCompletion(lines, locator)) {
            String inferredType = inferSwaggerParameterType(locator.fieldName(), item.getFieldType());
            if (inferredType != null && addSwaggerParameterType(lines, locator, inferredType)) {
                // 类型添加成功后，继续后续修复
            } else {
                return false;
            }
        }

        LineBlock targetBlock = findSwaggerValidationBlock(lines, locator);
        if (targetBlock == null) {
            return false;
        }

        return switch (item.getIssue()) {
            case "String 字段缺少长度校验" -> {
                boolean changed = false;
                changed |= upsertSwaggerScalar(lines, targetBlock, "minLength", String.valueOf(ValidationConstants.DEFAULT_MIN_LENGTH));
                changed |= upsertSwaggerScalar(lines, targetBlock, "maxLength", String.valueOf(ValidationConstants.DEFAULT_MAX_LENGTH));
                yield changed;
            }
            case "String 字段只有 minLength，缺少 maxLength" ->
                upsertSwaggerScalar(lines, targetBlock, "maxLength", String.valueOf(ValidationConstants.DEFAULT_MAX_LENGTH));
            case "String 字段只有 maxLength，缺少 minLength",
             "路径参数缺少最小长度校验" ->
                upsertSwaggerScalar(lines, targetBlock, "minLength", String.valueOf(ValidationConstants.DEFAULT_MIN_LENGTH));
            case "minLength 不能大于 maxLength" -> {
                boolean changed = false;
                changed |= upsertSwaggerScalar(lines, targetBlock, "minLength", String.valueOf(ValidationConstants.DEFAULT_MIN_LENGTH));
                changed |= upsertSwaggerScalar(lines, targetBlock, "maxLength", String.valueOf(ValidationConstants.DEFAULT_MAX_LENGTH));
                yield changed;
            }
            case "邮箱字段建议添加 email 校验" ->
                upsertSwaggerScalar(lines, targetBlock, "format", "email");
            case "电话字段建议添加正则校验" ->
                upsertSwaggerScalar(lines, targetBlock, "pattern", quoteYamlString(ValidationConstants.PHONE_PATTERN));
            case "List 字段缺少大小校验" -> {
                boolean changed = false;
                changed |= upsertSwaggerScalar(lines, targetBlock, "minItems", String.valueOf(ValidationConstants.DEFAULT_MIN_SIZE));
                changed |= upsertSwaggerScalar(lines, targetBlock, "maxItems", String.valueOf(ValidationConstants.DEFAULT_MAX_SIZE));
                yield changed;
            }
            case "List 字段只有 minSize，缺少 maxSize" ->
                upsertSwaggerScalar(lines, targetBlock, "maxItems", String.valueOf(ValidationConstants.DEFAULT_MAX_SIZE));
            case "List 字段只有 maxSize，缺少 minSize" ->
                upsertSwaggerScalar(lines, targetBlock, "minItems", String.valueOf(ValidationConstants.DEFAULT_MIN_SIZE));
            case "minSize 不能大于 maxSize",
                 "maxSize 必须 > 0" -> {
                boolean changed = false;
                changed |= upsertSwaggerScalar(lines, targetBlock, "minItems", String.valueOf(ValidationConstants.DEFAULT_MIN_SIZE));
                changed |= upsertSwaggerScalar(lines, targetBlock, "maxItems", String.valueOf(ValidationConstants.DEFAULT_MAX_SIZE));
                yield changed;
            }
            case "生日字段建议添加 past 校验" ->
                upsertSwaggerScalar(lines, targetBlock, "past", "true");
            case "预约字段建议添加 future 校验" ->
                upsertSwaggerScalar(lines, targetBlock, "future", "true");
            case "数值字段缺少范围校验",
                 "页码字段缺少范围校验",
                 "页码字段缺少 min 校验",
                 "页码字段缺少 max 校验",
                 "每页数量字段缺少范围校验",
                 "每页数量字段缺少 min 校验",
                 "每页数量字段缺少 max 校验" -> {
                Number minValue = defaultSwaggerMinimum(item);
                Number maxValue = defaultSwaggerMaximum(item);
                boolean changed = false;
                changed |= upsertSwaggerScalar(lines, targetBlock, "minimum", formatSwaggerNumber(minValue));
                changed |= upsertSwaggerScalar(lines, targetBlock, "maximum", formatSwaggerNumber(maxValue));
                yield changed;
            }
            case "数值字段只有 min，缺少 max" ->
                upsertSwaggerScalar(lines, targetBlock, "maximum", formatSwaggerNumber(defaultSwaggerMaximum(item)));
            case "数值字段只有 max，缺少 min",
             "路径参数缺少最小值校验" ->
                upsertSwaggerScalar(lines, targetBlock, "minimum", formatSwaggerNumber(defaultSwaggerMinimum(item)));
            case "min 不能大于 max",
                 "max 必须大于 min" -> {
                boolean changed = false;
                changed |= upsertSwaggerScalar(lines, targetBlock, "minimum", formatSwaggerNumber(defaultSwaggerMinimum(item)));
                changed |= upsertSwaggerScalar(lines, targetBlock, "maximum", formatSwaggerNumber(defaultSwaggerMaximum(item)));
                yield changed;
            }
            // "必填字段缺少 @NotNull/@NotBlank 校验" 不自动修复
            // 用户需要在手动修复表单中确认是否添加 @NotNull/@NotBlank
            default -> false;
            };
    }

    private boolean requiresSwaggerExplicitType(String issue) {
        return switch (issue) {
            case "String 字段缺少长度校验",
                 "String 字段只有 minLength，缺少 maxLength",
                 "String 字段只有 maxLength，缺少 minLength",
                 "路径参数缺少最小长度校验",
                 "minLength 不能大于 maxLength",
                 "邮箱字段建议添加 email 校验",
                 "电话字段建议添加正则校验",
                 "List 字段缺少大小校验",
                 "List 字段只有 minSize，缺少 maxSize",
                 "List 字段只有 maxSize，缺少 minSize",
                 "minSize 不能大于 maxSize",
                 "maxSize 必须 > 0",
                 "生日字段建议添加 past 校验",
                 "预约字段建议添加 future 校验",
                 "数值字段缺少范围校验",
                 "页码字段缺少范围校验",
                 "页码字段缺少 min 校验",
                 "页码字段缺少 max 校验",
                 "每页数量字段缺少范围校验",
                 "每页数量字段缺少 min 校验",
                 "每页数量字段缺少 max 校验",
                 "数值字段只有 min，缺少 max",
                 "数值字段只有 max，缺少 min",
                 "路径参数缺少最小值校验",
                 "min 不能大于 max",
                 "max 必须大于 min" -> true;
            default -> false;
        };
    }

    private boolean swaggerParameterNeedsManualCompletion(List<String> lines, UiLocator locator) {
        LineBlock operationBlock = findSwaggerOperationBlock(lines, locator);
        if (operationBlock == null) {
            return false;
        }

        SwaggerParameterContext parameterContext = findSwaggerParameterContext(lines, operationBlock, locator.fieldName());
        if (parameterContext == null) {
            return false;
        }

        return parameterContext.typeLine() < 0;
    }

    /**
     * 推断 Swagger parameter 的类型
     * 返回 null 表示无法推断，需要用户手动确认
     */
    private String inferSwaggerParameterType(String fieldName, String fieldType) {
        if (fieldType != null && !fieldType.isBlank()) {
            return mapJavaTypeToSwaggerType(fieldType);
        }
        if (fieldName == null || fieldName.isBlank()) {
            return "string";
        }
        String lower = fieldName.toLowerCase();

        // 模糊字段名，无法确定类型，需要用户手动选择
        if (lower.matches("^(data|value|input|output|content|field|param|parameter|item|element|object|entity|model|dto|vo|request|response|result|payload|body|text|info|message)$")) {
            return null; // 无法推断，需要手动处理
        }

        if (lower.matches("^(id|_id)$") || lower.endsWith("id")) return "integer";
        if (lower.matches("^(price|amount|total|fee|cost|balance|salary|score|rating)$")) return "number";
        if (lower.matches("^(count|quantity|num|number|age|size|page|pagenum|pageno|pagenumber|pagesize|perpage|limit)$")) return "integer";
        if (lower.matches("^(is|has|can|should|enable|disable|active|visible|deleted|enabled|disabled|hidden).*")) return "boolean";
        if (lower.matches("^(createdat|updatedat|deletedat|created_at|updated_at|deleted_at)$")) return "string";
        if (lower.matches("^(date|birthday|dob|birthdate)$")) return "string";

        return "string";
    }

    /**
     * 将 Java 类型映射到 Swagger 类型
     */
    private String mapJavaTypeToSwaggerType(String javaType) {
        if (javaType == null || javaType.isBlank()) {
            return "string";
        }
        String cleanType = javaType.replace("\"", "").trim();
        return switch (cleanType) {
            case "String", "LocalDate", "LocalDateTime" -> "string";
            case "Integer", "Long" -> "integer";
            case "Double", "Float" -> "number";
            case "Boolean" -> "boolean";
            default -> "string";
        };
    }

    /**
     * 为 Swagger parameter 添加 type 行
     */
    private boolean addSwaggerParameterType(List<String> lines, UiLocator locator, String swaggerType) {
        LineBlock operationBlock = findSwaggerOperationBlock(lines, locator);
        if (operationBlock == null) {
            return false;
        }

        SwaggerParameterContext parameterContext = findSwaggerParameterContext(lines, operationBlock, locator.fieldName());
        if (parameterContext == null) {
            return false;
        }

        // 如果已有 type 行，不重复添加
        if (parameterContext.typeLine() >= 0) {
            return false;
        }

        // 确定插入位置和缩进
        int insertLine = parameterContext.itemStart() + 1;
        String typeIndent;
        if (parameterContext.schemaLine() >= 0) {
            // 在 schema 块内添加
            insertLine = parameterContext.schemaLine() + 1;
            int schemaIndent = indent(lines.get(parameterContext.schemaLine()));
            typeIndent = indentText(schemaIndent + 2);
        } else {
            // 没有 schema 块，需要先创建 schema 块
            // 找到参数块的最后一行（in/description/required 之后）
            for (int i = parameterContext.itemStart() + 1; i < parameterContext.itemEnd(); i++) {
                String trimmed = lines.get(i).trim();
                if (trimmed.startsWith("in:") || trimmed.startsWith("description:") || trimmed.startsWith("required:")) {
                    insertLine = i + 1;
                }
            }
            int itemIndent = parameterContext.itemIndent();
            // schema: 与 name:/in:/required: 同级
            // 在 "- name:" 行中，属性在 indent + 2 的位置
            String schemaIndentText = indentText(itemIndent + 2);
            lines.add(insertLine, schemaIndentText + "schema:");
            insertLine++;
            typeIndent = indentText(itemIndent + 4);
        }

        // 插入 type 行
        lines.add(insertLine, typeIndent + "type: " + swaggerType);
        return true;
    }

    private String normalizeSwaggerPath(String path) {
        if (path == null || path.isBlank()) {
            return "/";
        }
        String normalized = path.replace('\\', '/').replaceAll("/+", "/");
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        return normalized;
    }

    private Number defaultSwaggerMinimum(ValidationAnalyzer.AnalysisItem item) {
        String issue = item.getIssue();
        if (issue != null) {
            if (issue.startsWith("页码字段") || issue.startsWith("路径参数缺少最小值")) {
                return ValidationConstants.DEFAULT_PAGE_MIN;
            }
            if (issue.startsWith("每页数量字段")) {
                return ValidationConstants.DEFAULT_PAGE_SIZE_MIN;
            }
        }
        return isFloatingNumberType(item.getFieldType()) ? ValidationConstants.DEFAULT_MIN_VALUE : (int) ValidationConstants.DEFAULT_MIN_VALUE;
    }

    private Number defaultSwaggerMaximum(ValidationAnalyzer.AnalysisItem item) {
        String issue = item.getIssue();
        if (issue != null) {
            if (issue.startsWith("页码字段")) {
                return ValidationConstants.DEFAULT_PAGE_MAX;
            }
            if (issue.startsWith("每页数量字段")) {
                return ValidationConstants.DEFAULT_PAGE_SIZE_MAX;
            }
        }

        String fieldType = item.getFieldType() == null ? "" : item.getFieldType().replace("\"", "").trim();
        return switch (fieldType) {
            case "Double" -> ValidationConstants.DEFAULT_MAX_DOUBLE;
            case "Long" -> ValidationConstants.DEFAULT_MAX_LONG;
            case "Integer" -> ValidationConstants.DEFAULT_MAX_INTEGER;
            default -> ValidationConstants.DEFAULT_MAX_INTEGER;
        };
    }

    private boolean isFloatingNumberType(String fieldType) {
        return "Double".equals(fieldType == null ? "" : fieldType.replace("\"", "").trim());
    }

    private LineBlock findSwaggerValidationBlock(List<String> lines, UiLocator locator) {
        LineBlock operationBlock = findSwaggerOperationBlock(lines, locator);
        if (operationBlock == null) {
            return null;
        }

        LineBlock parameterBlock = findSwaggerParameterBlock(lines, operationBlock, locator.fieldName());
        if (parameterBlock != null) {
            return parameterBlock;
        }

        LineBlock requestBodyBlock = findSwaggerRequestBodySchemaBlock(lines, operationBlock);
        LineBlock requestBodyFieldBlock = findSwaggerSchemaPropertyBlock(lines, requestBodyBlock, locator.fieldName());
        if (requestBodyFieldBlock != null) {
            return requestBodyFieldBlock;
        }

        String requestBodyRef = findSwaggerSchemaRef(lines, requestBodyBlock);
        if (requestBodyRef != null) {
            LineBlock requestBodyRefBlock = findSwaggerReferencedSchemaBlock(lines, requestBodyRef);
            LineBlock requestBodyRefFieldBlock = findSwaggerSchemaPropertyBlock(lines, requestBodyRefBlock, locator.fieldName());
            if (requestBodyRefFieldBlock != null) {
                return requestBodyRefFieldBlock;
            }
        }

        LineBlock bodyParameterSchemaBlock = findSwaggerBodyParameterSchemaBlock(lines, operationBlock);
        LineBlock bodyParameterFieldBlock = findSwaggerSchemaPropertyBlock(lines, bodyParameterSchemaBlock, locator.fieldName());
        if (bodyParameterFieldBlock != null) {
            return bodyParameterFieldBlock;
        }

        String bodyParameterRef = findSwaggerSchemaRef(lines, bodyParameterSchemaBlock);
        if (bodyParameterRef != null) {
            LineBlock bodyParameterRefBlock = findSwaggerReferencedSchemaBlock(lines, bodyParameterRef);
            LineBlock bodyParameterRefFieldBlock = findSwaggerSchemaPropertyBlock(lines, bodyParameterRefBlock, locator.fieldName());
            if (bodyParameterRefFieldBlock != null) {
                return bodyParameterRefFieldBlock;
            }
        }

        // Response schema (Swagger 2.0 / OpenAPI 3.0)
        LineBlock responseSchemaBlock = findSwaggerResponseSchemaBlock(lines, operationBlock);
        LineBlock responseFieldBlock = findSwaggerSchemaPropertyBlock(lines, responseSchemaBlock, locator.fieldName());
        if (responseFieldBlock != null) {
            return responseFieldBlock;
        }

        String responseRef = findSwaggerSchemaRef(lines, responseSchemaBlock);
        if (responseRef != null) {
            LineBlock responseRefBlock = findSwaggerReferencedSchemaBlock(lines, responseRef);
            LineBlock responseRefFieldBlock = findSwaggerSchemaPropertyBlock(lines, responseRefBlock, locator.fieldName());
            if (responseRefFieldBlock != null) {
                return responseRefFieldBlock;
            }
        }

        return null;
    }

    private LineBlock findSwaggerOperationBlock(List<String> lines, UiLocator locator) {
        int pathLine = findSwaggerPathLine(lines, locator.path(), 0, lines.size());
        if (pathLine < 0) {
            pathLine = findSwaggerOperationPathByOperationId(lines, locator.apiName());
        }
        if (pathLine < 0) {
            return null;
        }

        int pathIndent = indent(lines.get(pathLine));
        String methodToken = (locator.method() == null ? "" : locator.method().toLowerCase(Locale.ROOT)) + ":";
        int methodLine = -1;
        for (int i = pathLine + 1; i < lines.size(); i++) {
            String line = lines.get(i);
            if (line.trim().isEmpty()) {
                continue;
            }
            int currentIndent = indent(line);
            if (currentIndent <= pathIndent) {
                break;
            }
            if (line.trim().equals(methodToken)) {
                methodLine = i;
                break;
            }
        }
        if (methodLine < 0) {
            return null;
        }

        return new LineBlock(methodLine, findBlockEnd(lines, methodLine));
    }

    private int findSwaggerOperationPathByOperationId(List<String> lines, String operationId) {
        if (operationId == null || operationId.isBlank()) {
            return -1;
        }

        for (int i = 0; i < lines.size(); i++) {
            String trimmed = lines.get(i).trim();
            if (!trimmed.equals("operationId: " + operationId) &&
                !trimmed.equals("operationId: \"" + operationId + "\"")) {
                continue;
            }

            for (int j = i - 1; j >= 0; j--) {
                String candidate = lines.get(j);
                String key = extractYamlKey(candidate.trim());
                if (key != null && key.startsWith("/")) {
                    return j;
                }
            }
        }

        return -1;
    }

    private LineBlock findSwaggerParameterBlock(List<String> lines, LineBlock operationBlock, String fieldName) {
        SwaggerParameterContext context = findSwaggerParameterContext(lines, operationBlock, fieldName);
        if (context == null) {
            return null;
        }
        if (context.schemaLine() < 0) {
            return new LineBlock(context.itemStart(), context.itemEnd());
        }
        return new LineBlock(context.schemaLine(), findBlockEnd(lines, context.schemaLine(), context.itemEnd()));
    }

    private SwaggerParameterContext findSwaggerParameterContext(List<String> lines, LineBlock operationBlock, String fieldName) {
        if (fieldName == null || fieldName.isBlank()) {
            return null;
        }

        int parametersLine = -1;
        for (int i = operationBlock.start(); i < operationBlock.end(); i++) {
            if (lines.get(i).trim().equals("parameters:")) {
                parametersLine = i;
                break;
            }
        }
        if (parametersLine < 0) {
            return null;
        }

        int parametersIndent = indent(lines.get(parametersLine));
        for (int i = parametersLine + 1; i < operationBlock.end(); i++) {
            String line = lines.get(i);
            if (line.trim().isEmpty()) {
                continue;
            }

            int currentIndent = indent(line);
            if (currentIndent <= parametersIndent) {
                break;
            }

            String trimmed = line.trim();
            if (trimmed.equals("- name: " + fieldName) ||
                trimmed.equals("- name: \"" + fieldName + "\"")) {
                int itemEnd = findSiblingBlockEnd(lines, i, currentIndent, operationBlock.end());
                int schemaLine = -1;
                int typeLine = -1;
                for (int j = i + 1; j < itemEnd; j++) {
                    String childTrimmed = lines.get(j).trim();
                    if (childTrimmed.equals("schema:")) {
                        schemaLine = j;
                    } else if (childTrimmed.startsWith("type:")) {
                        typeLine = j;
                    }
                }
                if (schemaLine >= 0) {
                    int schemaEnd = findBlockEnd(lines, schemaLine, itemEnd);
                    for (int j = schemaLine + 1; j < schemaEnd; j++) {
                        if (lines.get(j).trim().startsWith("type:")) {
                            typeLine = j;
                            break;
                        }
                    }
                }
                return new SwaggerParameterContext(i, itemEnd, currentIndent, schemaLine, typeLine);
            }
        }

        return null;
    }

    private LineBlock findSwaggerBodyParameterSchemaBlock(List<String> lines, LineBlock operationBlock) {
        int parametersLine = -1;
        for (int i = operationBlock.start(); i < operationBlock.end(); i++) {
            if (lines.get(i).trim().equals("parameters:")) {
                parametersLine = i;
                break;
            }
        }
        if (parametersLine < 0) {
            return null;
        }

        int parametersIndent = indent(lines.get(parametersLine));
        for (int i = parametersLine + 1; i < operationBlock.end(); i++) {
            String line = lines.get(i);
            if (line.trim().isEmpty()) {
                continue;
            }

            int currentIndent = indent(line);
            if (currentIndent <= parametersIndent) {
                break;
            }
            if (!line.trim().startsWith("- ")) {
                continue;
            }

            int itemEnd = findSiblingBlockEnd(lines, i, currentIndent, operationBlock.end());
            boolean bodyParameter = false;
            int schemaLine = -1;
            for (int j = i + 1; j < itemEnd; j++) {
                String trimmed = lines.get(j).trim();
                if (trimmed.equals("in: body")) {
                    bodyParameter = true;
                } else if (trimmed.equals("schema:")) {
                    schemaLine = j;
                }
            }
            if (bodyParameter && schemaLine >= 0) {
                return new LineBlock(schemaLine, findBlockEnd(lines, schemaLine, itemEnd));
            }
        }

        return null;
    }

    private LineBlock findSwaggerRequestBodySchemaBlock(List<String> lines, LineBlock operationBlock) {
        int requestBodyLine = -1;
        for (int i = operationBlock.start(); i < operationBlock.end(); i++) {
            if (lines.get(i).trim().equals("requestBody:")) {
                requestBodyLine = i;
                break;
            }
        }
        if (requestBodyLine < 0) {
            return null;
        }

        int requestBodyEnd = findBlockEnd(lines, requestBodyLine, operationBlock.end());
        for (int i = requestBodyLine + 1; i < requestBodyEnd; i++) {
            if (lines.get(i).trim().equals("schema:")) {
                return new LineBlock(i, findBlockEnd(lines, i, requestBodyEnd));
            }
        }
        return null;
    }

    private LineBlock findSwaggerResponseSchemaBlock(List<String> lines, LineBlock operationBlock) {
        int responsesLine = -1;
        for (int i = operationBlock.start(); i < operationBlock.end(); i++) {
            if (lines.get(i).trim().equals("responses:")) {
                responsesLine = i;
                break;
            }
        }
        if (responsesLine < 0) {
            return null;
        }

        int responsesEnd = findBlockEnd(lines, responsesLine, operationBlock.end());
        int successResponseLine = -1;

        // Find 200 response first
        for (int i = responsesLine + 1; i < responsesEnd; i++) {
            String trimmed = lines.get(i).trim();
            if (trimmed.equals("200:") || trimmed.equals("'200':")) {
                successResponseLine = i;
                break;
            }
        }

        // Fall back to any response code
        if (successResponseLine < 0) {
            for (int i = responsesLine + 1; i < responsesEnd; i++) {
                String trimmed = lines.get(i).trim();
                if (trimmed.endsWith(":")) {
                    successResponseLine = i;
                    break;
                }
            }
        }

        if (successResponseLine < 0) {
            return null;
        }

        int responseEnd = findBlockEnd(lines, successResponseLine, responsesEnd);
        for (int i = successResponseLine + 1; i < responseEnd; i++) {
            if (lines.get(i).trim().equals("schema:")) {
                return new LineBlock(i, findBlockEnd(lines, i, responseEnd));
            }
        }
        return null;
    }

    private LineBlock findSwaggerSchemaPropertyBlock(List<String> lines, LineBlock schemaBlock, String fieldName) {
        if (schemaBlock == null || fieldName == null || fieldName.isBlank()) {
            return null;
        }

        int propertiesLine = -1;
        for (int i = schemaBlock.start(); i < schemaBlock.end(); i++) {
            if (lines.get(i).trim().equals("properties:")) {
                propertiesLine = i;
                break;
            }
        }
        if (propertiesLine < 0) {
            return null;
        }

        int propertiesEnd = findBlockEnd(lines, propertiesLine, schemaBlock.end());
        for (int i = propertiesLine + 1; i < propertiesEnd; i++) {
            String key = extractYamlKey(lines.get(i).trim());
            if (fieldName.equals(key)) {
                return new LineBlock(i, findBlockEnd(lines, i, propertiesEnd));
            }
        }
        return null;
    }

    private String findSwaggerSchemaRef(List<String> lines, LineBlock schemaBlock) {
        if (schemaBlock == null) {
            return null;
        }

        for (int i = schemaBlock.start() + 1; i < schemaBlock.end(); i++) {
            String trimmed = lines.get(i).trim();
            if (!trimmed.startsWith("$ref:")) {
                continue;
            }
            String value = trimmed.substring("$ref:".length()).trim();
            if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
                return value.substring(1, value.length() - 1);
            }
            return value;
        }
        return null;
    }

    private LineBlock findSwaggerReferencedSchemaBlock(List<String> lines, String ref) {
        if (ref == null || ref.isBlank()) {
            return null;
        }

        if (ref.startsWith("#/definitions/")) {
            return findNamedSchemaBlock(lines, "definitions", extractRefName(ref));
        }
        if (ref.startsWith("#/components/schemas/")) {
            int componentsLine = findSectionLine(lines, "components", 0, lines.size());
            if (componentsLine < 0) {
                return null;
            }
            int componentsEnd = findBlockEnd(lines, componentsLine);
            return findNamedSchemaBlock(lines, "schemas", extractRefName(ref), componentsLine, componentsEnd);
        }
        return null;
    }

    private LineBlock findNamedSchemaBlock(List<String> lines, String sectionName, String schemaName) {
        return findNamedSchemaBlock(lines, sectionName, schemaName, 0, lines.size());
    }

    private LineBlock findNamedSchemaBlock(List<String> lines, String sectionName, String schemaName, int start, int endExclusive) {
        if (schemaName == null || schemaName.isBlank()) {
            return null;
        }

        int sectionLine = findSectionLine(lines, sectionName, start, endExclusive);
        if (sectionLine < 0) {
            return null;
        }

        int sectionEnd = findBlockEnd(lines, sectionLine, endExclusive);
        for (int i = sectionLine + 1; i < sectionEnd; i++) {
            String key = extractYamlKey(lines.get(i).trim());
            if (schemaName.equals(key)) {
                return new LineBlock(i, findBlockEnd(lines, i, sectionEnd));
            }
        }
        return null;
    }

    private int findSectionLine(List<String> lines, String sectionName, int start, int endExclusive) {
        String sectionToken = sectionName + ":";
        for (int i = start; i < endExclusive; i++) {
            if (lines.get(i).trim().equals(sectionToken)) {
                return i;
            }
        }
        return -1;
    }

    private String extractRefName(String ref) {
        if (ref == null || ref.isBlank()) {
            return "";
        }
        int slashIndex = ref.lastIndexOf('/');
        return slashIndex >= 0 ? ref.substring(slashIndex + 1) : ref;
    }

    private boolean upsertSwaggerScalar(List<String> lines, LineBlock block, String fieldName, String value) {
        int fieldLine = findYamlFieldLine(lines, block, fieldName);
        String newLine;
        if (fieldLine >= 0) {
            String currentLine = lines.get(fieldLine);
            newLine = replaceYamlScalarValue(currentLine, value);
            if (newLine.equals(currentLine)) {
                return false;
            }
            lines.set(fieldLine, newLine);
            return true;
        }

        int insertIndex = findInsertIndex(lines, block);
        String indentText = indentText(indent(lines.get(block.start())) + 2);
        newLine = indentText + fieldName + ": " + value;
        lines.add(insertIndex, newLine);
        return true;
    }

    private int findYamlFieldLine(List<String> lines, LineBlock block, String fieldName) {
        for (int i = block.start() + 1; i < block.end(); i++) {
            if (lines.get(i).trim().startsWith(fieldName + ":")) {
                return i;
            }
        }
        return -1;
    }

    private int findInsertIndex(List<String> lines, LineBlock block) {
        int lastChild = block.start();
        int blockIndent = indent(lines.get(block.start()));
        for (int i = block.start() + 1; i < block.end(); i++) {
            String line = lines.get(i);
            if (line.trim().isEmpty()) {
                continue;
            }
            if (indent(line) > blockIndent) {
                lastChild = i;
            }
        }
        return lastChild + 1;
    }

    private int findSwaggerPathLine(List<String> lines, String targetPath, int start, int endExclusive) {
        if (targetPath == null || targetPath.isBlank()) {
            return -1;
        }
        String normalizedTarget = normalizeSwaggerPath(targetPath);
        for (int i = start; i < endExclusive; i++) {
            String key = extractYamlKey(lines.get(i).trim());
            if (key == null) {
                continue;
            }
            if (normalizedTarget.equals(normalizeSwaggerPath(key))) {
                return i;
            }
        }
        return -1;
    }

    private int findBlockEnd(List<String> lines, int startLine) {
        return findBlockEnd(lines, startLine, lines.size());
    }

    private int findBlockEnd(List<String> lines, int startLine, int limitExclusive) {
        int baseIndent = indent(lines.get(startLine));
        for (int i = startLine + 1; i < limitExclusive; i++) {
            String line = lines.get(i);
            if (line.trim().isEmpty()) {
                continue;
            }
            if (indent(line) <= baseIndent) {
                return i;
            }
        }
        return limitExclusive;
    }

    private int findSiblingBlockEnd(List<String> lines, int startLine, int itemIndent, int limitExclusive) {
        for (int i = startLine + 1; i < limitExclusive; i++) {
            String line = lines.get(i);
            if (line.trim().isEmpty()) {
                continue;
            }
            int currentIndent = indent(line);
            if (currentIndent < itemIndent) {
                return i;
            }
            if (currentIndent == itemIndent && line.trim().startsWith("- ")) {
                return i;
            }
        }
        return limitExclusive;
    }

    private String extractYamlKey(String trimmedLine) {
        if (trimmedLine == null || trimmedLine.isEmpty() || trimmedLine.startsWith("- ")) {
            return null;
        }
        int colonIndex = trimmedLine.indexOf(':');
        if (colonIndex <= 0) {
            return null;
        }
        String key = trimmedLine.substring(0, colonIndex).trim();
        if ((key.startsWith("\"") && key.endsWith("\"")) || (key.startsWith("'") && key.endsWith("'"))) {
            return key.substring(1, key.length() - 1);
        }
        return key;
    }

    private String replaceYamlKey(String line, String oldKey, String newKey) {
        return line.replaceFirst(Pattern.quote(oldKey) + "(?=\\s*:)", Matcher.quoteReplacement(newKey));
    }

    private String replaceYamlScalarValue(String line, String value) {
        Matcher matcher = Pattern.compile("^(\\s*[^:]+:\\s*)([^#]*?)(\\s*(#.*)?)$").matcher(line);
        if (!matcher.matches()) {
            return line;
        }
        String prefix = matcher.group(1);
        String suffix = matcher.group(3) == null ? "" : matcher.group(3);
        return prefix + value + suffix;
    }

    private String formatSwaggerNumber(Number value) {
        if (value instanceof Double || value instanceof Float) {
            double doubleValue = value.doubleValue();
            if (Math.rint(doubleValue) == doubleValue) {
                return String.valueOf((long) doubleValue);
            }
            return String.valueOf(doubleValue);
        }
        return String.valueOf(value.longValue());
    }

    private String quoteYamlString(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private int indent(String line) {
        int count = 0;
        while (count < line.length() && Character.isWhitespace(line.charAt(count))) {
            count++;
        }
        return count;
    }

    private String indentText(int size) {
        return " ".repeat(Math.max(size, 0));
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

    private record LineBlock(
        int start,
        int end
    ) {
    }

    private record SwaggerParameterContext(
        int itemStart,
        int itemEnd,
        int itemIndent,
        int schemaLine,
        int typeLine
    ) {
    }

    private record FixComputation(
        String fixedYaml,
        int fixedCount,
        String outputFormat
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
