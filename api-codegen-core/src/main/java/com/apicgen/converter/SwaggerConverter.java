package com.apicgen.converter;

import com.apicgen.model.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

import java.io.IOException;
import java.util.*;

/**
 * Swagger / OpenAPI 2.0 转换为 ApiDefinition
 * 不依赖 swagger-parser，使用纯 Jackson 解析
 */
public class SwaggerConverter {

    private String basePackage = "com.apicgen";
    private final ObjectMapper yamlMapper;

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

            // 处理各种 HTTP 方法
            for (String method : Arrays.asList("get", "post", "put", "delete", "patch")) {
                if (pathItem.has(method)) {
                    JsonNode operation = pathItem.get(method);
                    Api api = convertOperation(path, method.toUpperCase(), operation, root, basePath);
                    apis.add(api);
                }
            }
        }

        apiDefinition.setApis(apis);
        return apiDefinition;
    }

    @SuppressWarnings("unchecked")
    private Api convertOperation(String path, String method, JsonNode operation, JsonNode root, String basePath) {
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

        return api;
    }

    @SuppressWarnings("unchecked")
    private ClassDefinition convertRequest(JsonNode operation, JsonNode root) {
        List<FieldDefinition> fields = new ArrayList<>();

        // 处理 parameters
        if (operation.has("parameters") && operation.get("parameters").isArray()) {
            for (JsonNode param : operation.get("parameters")) {
                FieldDefinition field = new FieldDefinition();
                if (param.has("name")) {
                    field.setName(param.get("name").asText(""));
                }
                if (param.has("schema") && param.get("schema").has("type")) {
                    field.setType(convertJsonType(param.get("schema").get("type").asText()));
                    // 从 schema 提取校验规则
                    JsonNode schema = param.get("schema");
                    ValidationConfig validation = new ValidationConfig();

                    // 数值类型校验
                    if (schema.has("minimum")) {
                        validation.setMin(schema.get("minimum").asDouble());
                    }
                    if (schema.has("maximum")) {
                        validation.setMax(schema.get("maximum").asDouble());
                    }
                    // 字符串类型校验
                    if (schema.has("minLength")) {
                        validation.setMinLength(schema.get("minLength").asInt());
                    }
                    if (schema.has("maxLength")) {
                        validation.setMaxLength(schema.get("maxLength").asInt());
                    }
                    // 正则校验
                    if (schema.has("pattern")) {
                        validation.setPattern(schema.get("pattern").asText());
                    }
                    // 邮箱格式
                    if (schema.has("format") && "email".equals(schema.get("format").asText())) {
                        validation.setEmail(true);
                    }

                    // 如果有校验规则，设置到字段
                    if (validation.getMin() != null || validation.getMax() != null
                            || validation.getMinLength() != null || validation.getMaxLength() != null
                            || (validation.getPattern() != null && !validation.getPattern().isEmpty())
                            || Boolean.TRUE.equals(validation.getEmail())) {
                        field.setValidation(validation);
                    }
                } else {
                    field.setType("String");
                }
                if (param.has("required")) {
                    field.setRequired(param.get("required").asBoolean(false));
                }
                if (param.has("description")) {
                    field.setDescription(param.get("description").asText(""));
                }
                // 设置参数位置类型（path/query/header/cookie）
                if (param.has("in")) {
                    field.setIn(param.get("in").asText("query"));
                }
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
        List<FieldDefinition> fields = new ArrayList<>();

        if (schema == null) {
            return fields;
        }

        // 处理引用
        String refValue = getRefValue(schema);
        if (refValue != null) {
            String refName = extractRefName(refValue);
            FieldDefinition field = new FieldDefinition();
            String fieldName = defaultName;
            if (!refName.isEmpty()) {
                fieldName = refName.substring(0, 1).toLowerCase() + refName.substring(1);
            }
            field.setName(fieldName);
            field.setType(refName);
            fields.add(field);
            return fields;
        }

        // 处理数组类型
        if (schema.has("type") && "array".equals(schema.get("type").asText())) {
            FieldDefinition field = new FieldDefinition();
            field.setName(defaultName);
            if (schema.has("items")) {
                JsonNode items = schema.get("items");
                String itemType = extractTypeFromSchema(items, root);
                if (itemType != null) {
                    field.setType("List<" + itemType + ">");
                } else {
                    field.setType("List<Object>");
                }
            } else {
                field.setType("List<Object>");
            }
            fields.add(field);
            return fields;
        }

        // 处理对象类型
        if (schema.has("properties") && schema.get("properties").isObject()) {
            JsonNode properties = schema.get("properties");
            Iterator<String> fieldNames = properties.fieldNames();
            while (fieldNames.hasNext()) {
                String fieldName = fieldNames.next();
                JsonNode prop = properties.get(fieldName);
                FieldDefinition field = new FieldDefinition();
                field.setName(fieldName);
                field.setType(extractTypeFromSchema(prop, root));
                if (prop.has("description")) {
                    field.setDescription(prop.get("description").asText(""));
                }
                if (prop.has("required") && prop.get("required").isBoolean()) {
                    field.setRequired(prop.get("required").asBoolean(false));
                }
                fields.add(field);
            }
        }

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
        if (schema == null) {
            return "String";
        }

        // 处理引用
        String refValue = getRefValue(schema);
        if (refValue != null) {
            return extractRefName(refValue);
        }

        // 处理数组
        if (schema.has("type") && "array".equals(schema.get("type").asText())) {
            if (schema.has("items")) {
                String itemType = extractTypeFromSchema(schema.get("items"), root);
                return "List<" + itemType + ">";
            }
            return "List<Object>";
        }

        // 获取类型
        if (!schema.has("type")) {
            return "String";
        }

        String type = schema.get("type").asText("String");
        String format = schema.has("format") ? schema.get("format").asText("") : "";

        return convertJsonType(type, format);
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
     * 规范化路径：修复 // 和 /XXX/ 前缀
     */
    private String normalizePath(String path) {
        // 修复路径包含 // 的问题
        if (path.contains("//")) {
            path = path.replaceAll("/+", "/");
        }

        // 修复 /XXX/ 前缀（如 /XXX/users -> /users）
        if (path.matches("^/[A-Z][A-Z0-9_]*[/].*")) {
            path = path.replaceFirst("^/[A-Z][A-Z0-9_]*", "");
        }

        return path;
    }
}
