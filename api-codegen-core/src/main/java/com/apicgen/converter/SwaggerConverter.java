package com.apicgen.converter;

import com.apicgen.model.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

import java.io.IOException;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Swagger / OpenAPI 2.0 转换为 ApiDefinition
 * 不依赖 swagger-parser，使用纯 Jackson 解析
 */
public class SwaggerConverter {

    private String basePackage = "com.apicgen";
    private final ObjectMapper yamlMapper;

    // Type inference patterns based on field name
    private static final Pattern ID_PATTERN = Pattern.compile("^(id|Id|ID|_id|_Id|_ID)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern NAME_PATTERN = Pattern.compile("^(name|Name|NAME)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern PRICE_PATTERN = Pattern.compile("^(price|Price|amount|Amount|total|Total|fee|Fee|cost|Cost)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern COUNT_PATTERN = Pattern.compile("^(count|Count|quantity|Quantity|num|Num|number|Number|size|Size)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^(email|Email|mail|Mail|e_mail|eMail)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern PHONE_PATTERN = Pattern.compile("^(phone|Phone|mobile|Mobile|tel|Tel|telephone|Telephone)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern DATE_PATTERN = Pattern.compile("^(date|Date|time|Time|createdAt|updatedAt|deletedAt|created_at|updated_at|deleted_at)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern BOOLEAN_PATTERN = Pattern.compile("^(is|has|can|should|enable|disable|active|visible|deleted|enabled|disabled|visible|hidden)([A-Z].*)?$", Pattern.CASE_INSENSITIVE);
    private static final Pattern URL_PATTERN = Pattern.compile("^(url|Url|URL|link|Link|href|Href|uri|Uri|URI)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern PAGE_PATTERN = Pattern.compile("^(page|Page|pageNum|pageNum|pageNo|pageNo|pageNumber|pageNumber)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern PAGE_SIZE_PATTERN = Pattern.compile("^(pageSize|pageSize|perPage|perPage|limit|Limit|size|Size)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern AGE_PATTERN = Pattern.compile("^(age|Age)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern SCORE_PATTERN = Pattern.compile("^(score|Score|rating|Rating|level|Level|rank|Rank)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern CODE_PATTERN = Pattern.compile("^(code|Code|codeNo|codeNo|no|No)$", Pattern.CASE_INSENSITIVE);

    public SwaggerConverter() {
        this.yamlMapper = new ObjectMapper(new YAMLFactory());
    }

    public void setBasePackage(String basePackage) {
        this.basePackage = basePackage;
    }

    /**
     * 解析 Swagger YAML 内容
     */
    public ApiDefinition parse(String swaggerContent) {
        try {
            JsonNode root = yamlMapper.readTree(swaggerContent);
            return convert(root);
        } catch (IOException e) {
            throw new RuntimeException("Swagger 解析失败: " + e.getMessage(), e);
        }
    }

    /**
     * 将 Swagger JSON/YAML 转换为 ApiDefinition
     */
    @SuppressWarnings("unchecked")
    public ApiDefinition convert(JsonNode root) {
        ApiDefinition apiDefinition = new ApiDefinition();
        List<Api> apis = new ArrayList<>();

        // 获取 basePath
        String basePath = "";
        if (root.has("basePath")) {
            basePath = root.get("basePath").asText("");
        }

        // 处理 servers
        if (root.has("servers") && root.get("servers").isArray()) {
            JsonNode server = root.get("servers").get(0);
            if (server != null && server.has("url")) {
                String url = server.get("url").asText("");
                basePath = extractBasePath(url);
            }
        }

        // 获取 paths
        JsonNode paths = root.get("paths");
        if (paths == null || !paths.isObject()) {
            throw new RuntimeException("未找到 paths 定义");
        }

        Iterator<String> pathKeys = paths.fieldNames();
        while (pathKeys.hasNext()) {
            String path = pathKeys.next();
            JsonNode pathItem = paths.get(path);

            // 提取路径级别的 x-java-class-annotations
            List<String> classAnnotations = extractAnnotations(pathItem, "x-java-class-annotations");

            // 处理各种 HTTP 方法
            for (String method : Arrays.asList("get", "post", "put", "delete", "patch")) {
                if (pathItem.has(method)) {
                    JsonNode operation = pathItem.get(method);
                    Api api = convertOperation(path, method.toUpperCase(), operation, pathItem, root, basePath, classAnnotations);
                    apis.add(api);
                }
            }
        }

        apiDefinition.setApis(apis);
        return apiDefinition;
    }

    @SuppressWarnings("unchecked")
    private Api convertOperation(String path, String method, JsonNode operation, JsonNode pathItem, JsonNode root, String basePath, List<String> classAnnotations) {
        Api api = new Api();

        // 获取 operationId
        String operationId = operation.has("operationId") ? operation.get("operationId").asText("") : "";
        if (!operationId.isBlank()) {
            api.setName(operationId);
        } else {
            api.setName(generateApiName(method, path));
        }

        // 规范化路径：修复 // 和 /XXX/ 前缀
        String normalizedPath = normalizePath(basePath + path);
        api.setPath(normalizedPath);
        api.setMethod(Api.HttpMethod.valueOf(method));

        if (operation.has("summary")) {
            api.setDescription(operation.get("summary").asText(""));
        }

        // 转换 Request
        ClassDefinition requestDef = convertRequest(operation, root);
        if (requestDef != null) {
            api.setRequest(requestDef);
        }

        // 转换 Response
        ClassDefinition responseDef = convertResponse(operation, root);
        if (responseDef != null) {
            api.setResponse(responseDef);
        }

        // 解析自定义注解
        // 1. 类级别注解（从 pathItem 传入）
        if (classAnnotations != null && !classAnnotations.isEmpty()) {
            api.setClassAnnotations(classAnnotations);
        }

        // 2. 方法级别注解（从 operation 提取）
        List<String> methodAnnotations = extractAnnotations(operation, "x-java-method-annotations");
        if (methodAnnotations != null && !methodAnnotations.isEmpty()) {
            api.setMethodAnnotations(methodAnnotations);
        }

        return api;
    }

    /**
     * 从 JsonNode 提取 x-java-class-annotations 或 x-java-method-annotations
     */
    @SuppressWarnings("unchecked")
    private List<String> extractAnnotations(JsonNode node, String fieldName) {
        if (node == null || !node.has(fieldName)) {
            return null;
        }

        JsonNode annotationsNode = node.get(fieldName);
        if (!annotationsNode.isArray()) {
            return null;
        }

        List<String> annotations = new ArrayList<>();
        for (JsonNode annotation : annotationsNode) {
            if (annotation.isTextual()) {
                annotations.add(annotation.asText());
            }
        }

        return annotations.isEmpty() ? null : annotations;
    }

    @SuppressWarnings("unchecked")
    private ClassDefinition convertRequest(JsonNode operation, JsonNode root) {
        List<FieldDefinition> fields = new ArrayList<>();

        // 处理 parameters
        if (operation.has("parameters") && operation.get("parameters").isArray()) {
            for (JsonNode param : operation.get("parameters")) {
                String paramIn = param.has("in") ? param.get("in").asText("query") : "query";
                if ("body".equals(paramIn) && param.has("schema")) {
                    List<FieldDefinition> bodyFields = extractFieldsFromSchema(param.get("schema"), root, param.path("name").asText("body"));
                    for (FieldDefinition field : bodyFields) {
                        field.setIn("body");
                    }
                    fields.addAll(bodyFields);
                    continue;
                }

                FieldDefinition field = new FieldDefinition();
                if (param.has("name")) {
                    field.setName(param.get("name").asText(""));
                }
                if (param.has("schema")) {
                    JsonNode schema = param.get("schema");
                    field.setType(extractTypeFromSchema(schema, root));
                    ValidationConfig validation = extractValidationFromSchema(schema);
                    if (hasValidation(validation)) {
                        field.setValidation(validation);
                    }
                } else if (param.has("type")) {
                    field.setType(convertJsonType(param.get("type").asText(), param.path("format").asText("")));
                    ValidationConfig validation = extractValidationFromSchema(param);
                    if (hasValidation(validation)) {
                        field.setValidation(validation);
                    }
                } else {
                    // Infer type from field name when no explicit type/schema provided
                    String fieldName = param.has("name") ? param.get("name").asText("") : "";
                    field.setType(inferTypeFromFieldName(fieldName, paramIn));
                }
                if (param.has("required")) {
                    field.setRequired(param.get("required").asBoolean(false));
                }
                if (param.has("description")) {
                    field.setDescription(param.get("description").asText(""));
                }
                field.setIn(paramIn);
                fields.add(field);
            }
        }

        // 处理 requestBody
        if (operation.has("requestBody") && operation.get("requestBody").has("content")) {
            JsonNode content = operation.get("requestBody").get("content");
            if (content.has("application/json") && content.get("application/json").has("schema")) {
                JsonNode schema = content.get("application/json").get("schema");
                List<FieldDefinition> bodyFields = extractFieldsFromSchema(schema, root, "body");
                // 设置 in 为 body
                for (FieldDefinition field : bodyFields) {
                    field.setIn("body");
                }
                fields.addAll(bodyFields);
            }
        }

        if (fields.isEmpty()) {
            return null;
        }

        ClassDefinition classDef = new ClassDefinition();
        classDef.setClassName("Request");
        classDef.setFields(fields);
        return classDef;
    }

    @SuppressWarnings("unchecked")
    private ClassDefinition convertResponse(JsonNode operation, JsonNode root) {
        List<FieldDefinition> fields = new ArrayList<>();

        if (operation.has("responses") && operation.get("responses").isObject()) {
            JsonNode responses = operation.get("responses");

            // 找 2xx 响应
            JsonNode successResponse = null;
            for (String code : Arrays.asList("200", "201", "202", "204")) {
                if (responses.has(code)) {
                    successResponse = responses.get(code);
                    break;
                }
            }
            if (successResponse == null) {
                // 使用第一个响应
                Iterator<String> keys = responses.fieldNames();
                if (keys.hasNext()) {
                    successResponse = responses.get(keys.next());
                }
            }

            if (successResponse != null && successResponse.has("schema")) {
                fields.addAll(extractFieldsFromSchema(successResponse.get("schema"), root, "data"));
            } else if (successResponse != null && successResponse.has("content")) {
                JsonNode content = successResponse.get("content");
                if (content.has("application/json") && content.get("application/json").has("schema")) {
                    fields.addAll(extractFieldsFromSchema(content.get("application/json").get("schema"), root, "data"));
                }
            }
        }

        if (fields.isEmpty()) {
            // 默认添加 success 字段
            FieldDefinition field = new FieldDefinition();
            field.setName("success");
            field.setType("Boolean");
            field.setDescription("操作是否成功");
            fields.add(field);
        }

        ClassDefinition classDef = new ClassDefinition();
        classDef.setClassName("Response");
        classDef.setFields(fields);
        return classDef;
    }

    @SuppressWarnings("unchecked")
    private List<FieldDefinition> extractFieldsFromSchema(JsonNode schema, JsonNode root, String defaultName) {
        return extractFieldsFromSchema(schema, root, defaultName, new HashSet<>());
    }

    private List<FieldDefinition> extractFieldsFromSchema(JsonNode schema, JsonNode root, String defaultName, Set<String> visitedRefs) {
        List<FieldDefinition> fields = new ArrayList<>();

        if (schema == null) {
            return fields;
        }

        // 处理引用
        String refValue = getRefValue(schema);
        if (refValue != null) {
            if (visitedRefs.contains(refValue)) {
                return fields;
            }
            visitedRefs.add(refValue);
            JsonNode resolvedSchema = resolveRefSchema(refValue, root);
            if (resolvedSchema != null) {
                return extractFieldsFromSchema(resolvedSchema, root, defaultName, visitedRefs);
            }
        }

        // 处理数组类型
        if (schema.has("type") && "array".equals(schema.get("type").asText())) {
            FieldDefinition field = new FieldDefinition();
            field.setName(defaultName);
            field.setType(extractTypeFromSchema(schema, root));
            ValidationConfig validation = extractValidationFromSchema(schema);
            if (hasValidation(validation)) {
                field.setValidation(validation);
            }
            fields.add(field);
            return fields;
        }

        // 处理对象类型
        if (schema.has("properties") && schema.get("properties").isObject()) {
            Set<String> requiredFields = extractRequiredFields(schema);
            JsonNode properties = schema.get("properties");
            Iterator<String> fieldNames = properties.fieldNames();
            while (fieldNames.hasNext()) {
                String fieldName = fieldNames.next();
                JsonNode prop = properties.get(fieldName);
                FieldDefinition field = new FieldDefinition();
                field.setName(fieldName);
                field.setType(extractTypeFromSchema(prop, root, fieldName));
                ValidationConfig validation = extractValidationFromSchema(prop);
                if (hasValidation(validation)) {
                    field.setValidation(validation);
                }
                if (prop.has("description")) {
                    field.setDescription(prop.get("description").asText(""));
                }
                if (requiredFields.contains(fieldName) || (prop.has("required") && prop.get("required").isBoolean())) {
                    field.setRequired(requiredFields.contains(fieldName) || prop.get("required").asBoolean(false));
                }

                String nestedRefValue = getRefValue(prop);
                if (nestedRefValue != null) {
                    JsonNode nestedResolvedSchema = resolveRefSchema(nestedRefValue, root);
                    if (nestedResolvedSchema != null && nestedResolvedSchema.has("properties")) {
                        field.setFields(extractFieldsFromSchema(nestedResolvedSchema, root, fieldName, new HashSet<>(visitedRefs)));
                    }
                }
                fields.add(field);
            }

            if (!fields.isEmpty()) {
                return fields;
            }
        }

        FieldDefinition field = new FieldDefinition();
        field.setName(defaultName);
        field.setType(extractTypeFromSchema(schema, root, defaultName));
        ValidationConfig validation = extractValidationFromSchema(schema);
        if (hasValidation(validation)) {
            field.setValidation(validation);
        }
        fields.add(field);
        return fields;
    }

    private String getRefValue(JsonNode node) {
        if (node.has("$ref")) {
            return node.get("$ref").asText();
        }
        // Jackson 在某些版本可能会把 $ref 解析为不同形式
        Iterator<String> fieldNames = node.fieldNames();
        while (fieldNames.hasNext()) {
            String name = fieldNames.next();
            if (name.contains("ref")) {
                return node.get(name).asText();
            }
        }
        return null;
    }

    private String extractTypeFromSchema(JsonNode schema, JsonNode root) {
        return extractTypeFromSchema(schema, root, null);
    }

    private String extractTypeFromSchema(JsonNode schema, JsonNode root, String fieldName) {
        if (schema == null) {
            return inferTypeFromFieldName(fieldName, null);
        }

        // 处理引用
        String refValue = getRefValue(schema);
        if (refValue != null) {
            JsonNode resolvedSchema = resolveRefSchema(refValue, root);
            if (resolvedSchema != null && resolvedSchema.has("type")) {
                return extractTypeFromSchema(resolvedSchema, root, fieldName);
            }
            return extractRefName(refValue);
        }

        // 处理数组
        if (schema.has("type") && "array".equals(schema.get("type").asText())) {
            if (schema.has("items")) {
                String itemType = extractTypeFromSchema(schema.get("items"), root, fieldName);
                return "List<" + itemType + ">";
            }
            return "List<Object>";
        }

        // 获取类型
        if (!schema.has("type")) {
            return inferTypeFromFieldName(fieldName, null);
        }

        String type = schema.get("type").asText("String");
        String format = schema.has("format") ? schema.get("format").asText("") : "";

        return convertJsonType(type, format);
    }

    private JsonNode resolveRefSchema(String ref, JsonNode root) {
        if (ref == null || ref.isBlank() || root == null || !ref.startsWith("#/")) {
            return null;
        }

        JsonNode current = root;
        String[] segments = ref.substring(2).split("/");
        for (String segment : segments) {
            if (current == null) {
                return null;
            }
            current = current.get(segment);
        }
        return current;
    }

    private Set<String> extractRequiredFields(JsonNode schema) {
        Set<String> requiredFields = new LinkedHashSet<>();
        if (schema == null || !schema.has("required") || !schema.get("required").isArray()) {
            return requiredFields;
        }

        for (JsonNode requiredField : schema.get("required")) {
            if (requiredField.isTextual()) {
                requiredFields.add(requiredField.asText());
            }
        }
        return requiredFields;
    }

    private ValidationConfig extractValidationFromSchema(JsonNode schema) {
        ValidationConfig validation = new ValidationConfig();
        if (schema == null) {
            return validation;
        }

        if (schema.has("minimum")) {
            validation.setMin(schema.get("minimum").asDouble());
        }
        if (schema.has("maximum")) {
            validation.setMax(schema.get("maximum").asDouble());
        }
        if (schema.has("minLength")) {
            validation.setMinLength(schema.get("minLength").asInt());
        }
        if (schema.has("maxLength")) {
            validation.setMaxLength(schema.get("maxLength").asInt());
        }
        if (schema.has("pattern")) {
            validation.setPattern(schema.get("pattern").asText());
        }
        if (schema.has("format") && "email".equals(schema.get("format").asText())) {
            validation.setEmail(true);
        }
        if (schema.has("minItems")) {
            validation.setMinSize(schema.get("minItems").asInt());
        }
        if (schema.has("maxItems")) {
            validation.setMaxSize(schema.get("maxItems").asInt());
        }
        if (schema.has("past")) {
            validation.setPast(schema.get("past").asBoolean(false));
        }
        if (schema.has("future")) {
            validation.setFuture(schema.get("future").asBoolean(false));
        }

        return validation;
    }

    private boolean hasValidation(ValidationConfig validation) {
        if (validation == null) {
            return false;
        }

        return validation.getMin() != null
            || validation.getMax() != null
            || validation.getMinLength() != null
            || validation.getMaxLength() != null
            || validation.getPattern() != null
            || Boolean.TRUE.equals(validation.getEmail())
            || validation.getMinSize() != null
            || validation.getMaxSize() != null
            || Boolean.TRUE.equals(validation.getPast())
            || Boolean.TRUE.equals(validation.getFuture());
    }

    private String convertJsonType(String type) {
        return convertJsonType(type, "");
    }

    private String convertJsonType(String type, String format) {
        switch (type.toLowerCase()) {
            case "string":
                if ("date-time".equals(format)) return "LocalDateTime";
                if ("date".equals(format)) return "LocalDate";
                if ("email".equals(format)) return "String";
                return "String";
            case "integer":
            case "int32":
                return "Integer";
            case "long":
            case "int64":
                return "Long";
            case "number":
            case "double":
            case "float":
                return "Double";
            case "boolean":
                return "Boolean";
            case "array":
                return "List<Object>";
            case "object":
                return "Object";
            default:
                return "String";
        }
    }

    /**
     * Infer type from field name when no explicit type is provided.
     * This helps reduce manual intervention for common naming patterns.
     */
    private String inferTypeFromFieldName(String fieldName, String paramIn) {
        if (fieldName == null || fieldName.isBlank()) {
            return "String";
        }

        // ID patterns → Integer or Long (path params usually Long, others Integer)
        if (ID_PATTERN.matcher(fieldName).matches()) {
            if ("path".equals(paramIn)) {
                return "Long";
            }
            return "Integer";
        }

        // Name patterns → String with length validation hint
        if (NAME_PATTERN.matcher(fieldName).matches()) {
            return "String";
        }

        // Price/Amount patterns → Double
        if (PRICE_PATTERN.matcher(fieldName).matches()) {
            return "Double";
        }

        // Count/Quantity patterns → Integer
        if (COUNT_PATTERN.matcher(fieldName).matches()) {
            return "Integer";
        }

        // Age pattern → Integer (0-150 range)
        if (AGE_PATTERN.matcher(fieldName).matches()) {
            return "Integer";
        }

        // Score/Rating patterns → Integer or Double
        if (SCORE_PATTERN.matcher(fieldName).matches()) {
            return "Double";
        }

        // Email patterns → String
        if (EMAIL_PATTERN.matcher(fieldName).matches()) {
            return "String";
        }

        // Phone patterns → String
        if (PHONE_PATTERN.matcher(fieldName).matches()) {
            return "String";
        }

        // Date patterns → LocalDateTime or LocalDate
        if (DATE_PATTERN.matcher(fieldName).matches()) {
            String lower = fieldName.toLowerCase();
            if (lower.contains("created") || lower.contains("updated") || lower.contains("deleted")) {
                return "LocalDateTime";
            }
            return "LocalDate";
        }

        // Boolean patterns → Boolean
        if (BOOLEAN_PATTERN.matcher(fieldName).matches()) {
            return "Boolean";
        }

        // URL patterns → String
        if (URL_PATTERN.matcher(fieldName).matches()) {
            return "String";
        }

        // Page patterns → Integer
        if (PAGE_PATTERN.matcher(fieldName).matches()) {
            return "Integer";
        }

        // PageSize patterns → Integer
        if (PAGE_SIZE_PATTERN.matcher(fieldName).matches()) {
            return "Integer";
        }

        // Code/No patterns → String
        if (CODE_PATTERN.matcher(fieldName).matches()) {
            return "String";
        }

        // Default to String
        return "String";
    }

    private String extractRefName(String ref) {
        if (ref == null || ref.isEmpty()) {
            return "";
        }
        int idx = ref.lastIndexOf('/');
        if (idx >= 0) {
            return ref.substring(idx + 1);
        }
        return ref;
    }

    private String extractBasePath(String url) {
        if (url == null || url.isEmpty()) {
            return "";
        }
        // 移除协议和域名
        url = url.replaceFirst("https?://[^/]+", "");
        return url.isEmpty() ? "" : url;
    }

    private String generateApiName(String method, String path) {
        String name = path.replaceAll("/\\{([^}]+)\\}", "")
                          .replaceAll("^/", "")
                          .replaceAll("/", "_");
        if (name.isEmpty()) {
            name = "root";
        }
        return method.toLowerCase() + Character.toUpperCase(name.charAt(0)) + name.substring(1);
    }

    /**
     * 规范化路径：统一分隔符、折叠重复分隔符，并修复 /XXX/ 前缀
     */
    private String normalizePath(String path) {
        if (path == null || path.isEmpty()) {
            return path;
        }

        path = path.replaceAll("[/\\\\]+", "/");

        // 修复 /XXX/ 前缀（如 /XXX/users -> /users）
        if (path.matches("^/[A-Z][A-Z0-9_]*[/].*")) {
            path = path.replaceFirst("^/[A-Z][A-Z0-9_]*", "");
        }

        return path;
    }
}
