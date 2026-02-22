package com.apicgen.generator.spring;

import com.apicgen.config.CodegenConfig;
import com.apicgen.generator.CodeGenerator;
import com.apicgen.model.*;
import com.apicgen.util.CodeGenUtil;

import javax.validation.Valid;
import javax.validation.constraints.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Spring MVC 代码生成器
 *
 * 使用 Spring MVC 注解：
 * - @PathVariable (替代 @PathParam)
 * - @RequestParam (替代 @QueryParam)
 * - @RequestHeader (替代 @HeaderParam)
 * - @CookieValue (替代 @CookieParam)
 * - @RequestBody (相同)
 */
public class SpringCodeGenerator implements CodeGenerator {

    // Spring MVC 注解导入
    private static final String SPRING_IMPORTS =
        "import org.springframework.web.bind.annotation.*;\n" +
        "import org.springframework.http.ResponseEntity;\n" +
        "import javax.validation.Valid;\n" +
        "import javax.validation.constraints.*;\n" +
        "import java.util.List;\n" +
        "import java.util.Map;\n";

    @Override
    public Map<String, String> generateController(Api api, CodegenConfig config) {
        Map<String, String> files = new LinkedHashMap<>();
        String className = getControllerClassName(api.getName());
        String content = generateControllerContent(api, config);
        files.put(className + ".java", content);
        return files;
    }

    @SuppressWarnings("unused")
    public Map<String, String> generateControllers(ApiDefinition apiDefinition, CodegenConfig config) {
        Map<String, String> files = new LinkedHashMap<>();

        String basePackage = config.getBasePackage() != null ? config.getBasePackage() : "com.apicgen";
        String moduleName = basePackage;
        if (basePackage.contains(".")) {
            moduleName = basePackage.substring(basePackage.lastIndexOf(".") + 1);
        }
        String className = capitalize(moduleName) + "Api";

        String content = generateUnifiedControllerContent(apiDefinition, config, className);
        files.put(className + ".java", content);
        return files;
    }

    @Override
    public Map<String, String> generateRequest(Api api, CodegenConfig config) {
        Map<String, String> files = new LinkedHashMap<>();
        generateClassFiles(api.getRequest(), "请求", config, files, null);
        return files;
    }

    @Override
    public Map<String, String> generateResponse(Api api, CodegenConfig config) {
        Map<String, String> files = new LinkedHashMap<>();
        generateClassFiles(api.getResponse(), "响应", config, files, null);
        return files;
    }

    private void generateClassFiles(ClassDefinition classDef, String classTypeDesc,
                                    CodegenConfig config, Map<String, String> files,
                                    String parentClassName) {
        String className = classDef.getClassName();
        String packageName = classTypeDesc.equals("请求") ? getRequestPackage(config) : getResponsePackage(config);

        String content = generateClassContent(classDef, classTypeDesc, config, packageName);
        files.put(className + ".java", content);

        for (FieldDefinition field : classDef.getFields()) {
            if (field.getFields() != null && !field.getFields().isEmpty()) {
                String nestedClassName = capitalize(field.getName());
                ClassDefinition nestedClass = new ClassDefinition();
                nestedClass.setClassName(nestedClassName);
                nestedClass.setFields(field.getFields());
                generateClassFiles(nestedClass, classTypeDesc, config, files, className);
            }
        }
    }

    private String generateControllerContent(Api api, CodegenConfig config) {
        StringBuilder sb = new StringBuilder();
        sb.append(getFileHeader(config));
        sb.append("package ").append(getControllerPackage(config)).append(";\n\n");
        sb.append(SPRING_IMPORTS);
        sb.append("\n@RestController\n");
        sb.append("@RequestMapping(\"").append(api.getPath()).append("\")\n");
        sb.append("public class ").append(getControllerClassName(api.getName())).append(" {\n\n");

        sb.append("    @").append(getSpringHttpMethodAnnotation(api.getMethod()));
        sb.append("(\"").append(api.getPath()).append("\")\n");
        sb.append("    public ResponseEntity<?> ").append(api.getName()).append("(");

        // 参数处理
        if (api.getRequest() != null && api.getRequest().getFields() != null) {
            List<FieldDefinition> params = api.getRequest().getFields();
            for (int i = 0; i < params.size(); i++) {
                FieldDefinition field = params.get(i);
                if (i > 0) sb.append(", ");
                sb.append(generateParameter(field));
            }
        }

        sb.append(") {\n");
        sb.append("        // TODO: 实现业务逻辑\n");
        sb.append("        return ResponseEntity.ok().build();\n");
        sb.append("    }\n");
        sb.append("}\n");
        return sb.toString();
    }

    private String generateUnifiedControllerContent(ApiDefinition apiDefinition, CodegenConfig config, String className) {
        StringBuilder sb = new StringBuilder();
        sb.append(getFileHeader(config));
        sb.append("package ").append(getControllerPackage(config)).append(";\n\n");
        sb.append(SPRING_IMPORTS);
        sb.append("\n@RestController\n");
        sb.append("public class ").append(className).append(" {\n\n");

        for (Api api : apiDefinition.getApis()) {
            sb.append(generateApiMethod(api, config));
            sb.append("\n");
        }

        sb.append("}\n");
        return sb.toString();
    }

    private String generateApiMethod(Api api, CodegenConfig config) {
        StringBuilder sb = new StringBuilder();

        // API 路径（相对于 Controller 根路径）
        String apiPath = api.getPath();
        if (apiPath.startsWith("/")) {
            apiPath = apiPath.substring(1);
        }

        // 添加自定义注解
        if (config.getCustomAnnotations() != null && config.getCustomAnnotations().getMethodAnnotations() != null) {
            for (String ann : config.getCustomAnnotations().getMethodAnnotations()) {
                sb.append("    ").append(ann).append("\n");
            }
        }

        // HTTP 方法注解
        sb.append("    @").append(getSpringHttpMethodAnnotation(api.getMethod()));
        sb.append("(\"").append(apiPath).append("\")\n");

        // 生成方法签名
        sb.append("    public ResponseEntity<?> ");
        sb.append(api.getName()).append("(");

        // 生成参数
        List<FieldDefinition> params = new ArrayList<>();
        if (api.getRequest() != null && api.getRequest().getFields() != null) {
            params.addAll(api.getRequest().getFields());
        }

        for (int i = 0; i < params.size(); i++) {
            FieldDefinition field = params.get(i);
            if (i > 0) sb.append(", ");
            sb.append(generateSpringParameter(field));
        }

        sb.append(") {\n");

        // 方法文档
        if (api.getDescription() != null && !api.getDescription().isEmpty()) {
            sb.append("        // ").append(api.getDescription()).append("\n");
        }

        sb.append("        // TODO: 实现业务逻辑\n");
        sb.append("        return ResponseEntity.ok().build();\n");
        sb.append("    }");

        return sb.toString();
    }

    /**
     * 生成 Spring MVC 参数（带注解）
     */
    private String generateSpringParameter(FieldDefinition field) {
        StringBuilder sb = new StringBuilder();

        // 根据参数位置添加 Spring 注解
        if ("path".equals(field.getIn())) {
            sb.append("@PathVariable");
        } else if ("query".equals(field.getIn())) {
            sb.append("@RequestParam");
        } else if ("header".equals(field.getIn())) {
            sb.append("@RequestHeader");
        } else if ("cookie".equals(field.getIn())) {
            sb.append("@CookieValue");
        } else if ("body".equals(field.getIn())) {
            sb.append("@RequestBody");
        }

        // 添加参数名（如果是 @RequestParam/@PathVariable 等，需要指定参数名）
        if ("path".equals(field.getIn()) || "query".equals(field.getIn()) ||
            "header".equals(field.getIn()) || "cookie".equals(field.getIn())) {
            sb.append("(\"").append(field.getName()).append("\")");
        }

        // 添加校验注解
        if (field.isRequired()) {
            if ("String".equals(field.getType())) {
                sb.append(" @NotBlank");
            } else {
                sb.append(" @NotNull");
            }
        }

        // 添加其他校验注解
        if (field.getValidation() != null) {
            ValidationConfig v = field.getValidation();

            // @Size (String 类型)
            if ("String".equals(field.getType())) {
                if (v.getMinLength() != null || v.getMaxLength() != null) {
                    sb.append(" @Size(");
                    boolean hasMin = false;
                    if (v.getMinLength() != null && v.getMinLength() > 0) {
                        sb.append("min=").append(v.getMinLength());
                        hasMin = true;
                    }
                    if (v.getMaxLength() != null) {
                        if (hasMin) sb.append(", ");
                        sb.append("max=").append(v.getMaxLength());
                    }
                    sb.append(")");
                }
            }

            // @Min/@Max (数值类型)
            if ("Integer".equals(field.getType()) || "Long".equals(field.getType()) ||
                "Double".equals(field.getType()) || "Float".equals(field.getType())) {
                if (v.getMin() != null) {
                    sb.append(" @Min(").append(v.getMin().longValue()).append(")");
                }
                if (v.getMax() != null) {
                    sb.append(" @Max(").append(v.getMax().longValue()).append(")");
                }
            }

            // @Email
            if (Boolean.TRUE.equals(v.getEmail())) {
                sb.append(" @Email");
            }

            // @Pattern (正则)
            if (v.getPattern() != null && !v.getPattern().isEmpty()) {
                sb.append(" @Pattern(regexp = \"").append(escapeRegex(v.getPattern())).append("\")");
            }

            // @Size (List 类型)
            if (field.getType() != null && field.getType().startsWith("List")) {
                if (v.getMinSize() != null || v.getMaxSize() != null) {
                    sb.append(" @Size(");
                    boolean hasMin = false;
                    if (v.getMinSize() != null) {
                        sb.append("min=").append(v.getMinSize());
                        hasMin = true;
                    }
                    if (v.getMaxSize() != null) {
                        if (hasMin) sb.append(", ");
                        sb.append("max=").append(v.getMaxSize());
                    }
                    sb.append(")");
                }
            }
        }

        // 参数类型和名称
        sb.append(" ");
        sb.append(getJavaType(field.getType()));
        sb.append(" ");
        sb.append(field.getName());

        return sb.toString();
    }

    private String generateParameter(FieldDefinition field) {
        return generateSpringParameter(field);
    }

    /**
     * Escape special characters in regex pattern to prevent injection.
     * This ensures the pattern is treated as a literal string within the generated code.
     */
    private static String escapeRegex(String pattern) {
        if (pattern == null) {
            return "";
        }
        // Escape characters that could break out of the string literal in Java
        return pattern
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String generateClassContent(ClassDefinition classDef, String classTypeDesc,
                                        CodegenConfig config, String packageName) {
        StringBuilder sb = new StringBuilder();
        sb.append(getFileHeader(config));
        sb.append("package ").append(packageName).append(";\n\n");

        // 导入
        sb.append("import javax.validation.constraints.*;\n");
        if (hasListField(classDef)) {
            sb.append("import java.util.List;\n");
        }
        sb.append("import lombok.Data;\n\n");

        // 类注解
        sb.append("@Data\n");
        if ("请求".equals(classTypeDesc)) {
            sb.append("public class ").append(classDef.getClassName()).append(" {\n\n");
        } else {
            sb.append("public class ").append(classDef.getClassName()).append(" {\n\n");
        }

        // 字段
        for (FieldDefinition field : classDef.getFields()) {
            sb.append(generateField(field, classTypeDesc));
        }

        sb.append("}\n");
        return sb.toString();
    }

    private boolean hasListField(ClassDefinition classDef) {
        for (FieldDefinition field : classDef.getFields()) {
            if (field.getType() != null && field.getType().startsWith("List")) {
                return true;
            }
        }
        return false;
    }

    private String generateField(FieldDefinition field, String classTypeDesc) {
        StringBuilder sb = new StringBuilder();

        // 字段注释
        if (field.getDescription() != null && !field.getDescription().isEmpty()) {
            sb.append("    /** ").append(field.getDescription()).append(" */\n");
        }

        // 校验注解
        if (field.isRequired() && "请求".equals(classTypeDesc)) {
            if ("String".equals(field.getType())) {
                sb.append("    @NotBlank\n");
            } else if (field.getType() != null && !field.getType().startsWith("List") &&
                       !"Boolean".equals(field.getType())) {
                sb.append("    @NotNull\n");
            }
        }

        // 类型校验注解
        if (field.getValidation() != null && "请求".equals(classTypeDesc)) {
            ValidationConfig v = field.getValidation();

            if ("String".equals(field.getType())) {
                if (v.getMinLength() != null || v.getMaxLength() != null) {
                    sb.append("    @Size(");
                    boolean hasMin = false;
                    if (v.getMinLength() != null && v.getMinLength() > 0) {
                        sb.append("min=").append(v.getMinLength());
                        hasMin = true;
                    }
                    if (v.getMaxLength() != null) {
                        if (hasMin) sb.append(", ");
                        sb.append("max=").append(v.getMaxLength());
                    }
                    sb.append(")\n");
                }
                if (Boolean.TRUE.equals(v.getEmail())) {
                    sb.append("    @Email\n");
                }
                if (v.getPattern() != null && !v.getPattern().isEmpty()) {
                    sb.append("    @Pattern(regexp = \"").append(escapeRegex(v.getPattern())).append("\")\n");
                }
            }

            if (isNumericType(field.getType())) {
                if (v.getMin() != null) {
                    sb.append("    @Min(").append(v.getMin().longValue()).append(")\n");
                }
                if (v.getMax() != null) {
                    sb.append("    @Max(").append(v.getMax().longValue()).append(")\n");
                }
            }

            if (field.getType() != null && field.getType().startsWith("List")) {
                if (v.getMinSize() != null || v.getMaxSize() != null) {
                    sb.append("    @Size(");
                    boolean hasMin = false;
                    if (v.getMinSize() != null) {
                        sb.append("min=").append(v.getMinSize());
                        hasMin = true;
                    }
                    if (v.getMaxSize() != null) {
                        if (hasMin) sb.append(", ");
                        sb.append("max=").append(v.getMaxSize());
                    }
                    sb.append(")\n");
                }
            }
        }

        // 字段声明
        sb.append("    private ");
        sb.append(getJavaType(field.getType()));
        sb.append(" ");
        sb.append(field.getName());
        sb.append(";\n\n");

        return sb.toString();
    }

    private boolean isNumericType(String type) {
        return "Integer".equals(type) || "Long".equals(type) ||
               "Double".equals(type) || "Float".equals(type) ||
               "BigDecimal".equals(type) || "BigInteger".equals(type);
    }

    private String getJavaType(String type) {
        if (type == null) return "Object";

        // 处理 List<T> 类型
        if (type.startsWith("List<") && type.endsWith(">")) {
            return type; // 保持原样，如 List<String>
        }

        // 常见类型映射
        switch (type) {
            case "String":
            case "Integer":
            case "Long":
            case "Double":
            case "Float":
            case "Boolean":
            case "LocalDate":
            case "LocalDateTime":
            case "Object":
                return type;
            default:
                return type;
        }
    }

    private String getControllerPackage(CodegenConfig config) {
        String base = config.getBasePackage() != null ? config.getBasePackage() : "com.apicgen";
        return base + ".controller";
    }

    private String getRequestPackage(CodegenConfig config) {
        String base = config.getBasePackage() != null ? config.getBasePackage() : "com.apicgen";
        return base + ".req";
    }

    private String getResponsePackage(CodegenConfig config) {
        String base = config.getBasePackage() != null ? config.getBasePackage() : "com.apicgen";
        return base + ".rsp";
    }

    private String getControllerClassName(String apiName) {
        return CodeGenUtil.capitalize(apiName) + "Controller";
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }

    private String getSpringHttpMethodAnnotation(Api.HttpMethod method) {
        switch (method) {
            case GET: return "GetMapping";
            case POST: return "PostMapping";
            case PUT: return "PutMapping";
            case DELETE: return "DeleteMapping";
            case PATCH: return "PatchMapping";
            default: return "PostMapping";
        }
    }

    private String getFileHeader(CodegenConfig config) {
        StringBuilder sb = new StringBuilder();
        if (config.getCopyright() != null && !config.getCopyright().isEmpty()) {
            sb.append("/*\n * ").append(config.getCopyright()).append("\n */\n\n");
        }
        return sb.toString();
    }
}
