package com.apicgen.generator.cxf;

import com.apicgen.config.CodegenConfig;
import com.apicgen.generator.CodeGenerator;
import com.apicgen.model.*;

import javax.validation.Valid;
import javax.validation.constraints.*;
import javax.ws.rs.*;
import java.util.*;

/**
 * CXF 代码生成器（JAX-RS 风格）
 */
public class CxfCodeGenerator implements CodeGenerator {

    @Override
    public Map<String, String> generateController(Api api, CodegenConfig config) {
        Map<String, String> files = new LinkedHashMap<>();
        String className = getControllerClassName(api.getName());
        String content = generateControllerContent(api, config);
        files.put(className + ".java", content);
        return files;
    }

    /**
     * 生成统一的 Controller（包含所有 API 方法）
     * @param apiDefinition 包含所有 API 的定义
     * @param config 配置
     * @return Map<文件名, 内容>
     */
    public Map<String, String> generateControllers(ApiDefinition apiDefinition, CodegenConfig config) {
        Map<String, String> files = new LinkedHashMap<>();

        // 根据 basePackage 生成统一的类名
        String basePackage = config.getBasePackage() != null ? config.getBasePackage() : "com.apicgen";
        // 从 basePackage 提取模块名作为类名（如 com.example.api -> Api）
        String moduleName = basePackage;
        if (basePackage.contains(".")) {
            moduleName = basePackage.substring(basePackage.lastIndexOf(".") + 1);
        }
        // 首字母大写作为类名
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

    /**
     * 递归生成类文件（包括嵌套对象）
     */
    private void generateClassFiles(ClassDefinition classDef, String classTypeDesc,
                                     CodegenConfig config, Map<String, String> files,
                                     String parentClassName) {
        String className = classDef.getClassName();
        String packageName = classTypeDesc.equals("请求") ? getRequestPackage(config) : getResponsePackage(config);

        // 生成主类
        String content = generateClassContent(classDef, classTypeDesc, config, packageName);
        files.put(className + ".java", content);

        // 递归生成嵌套对象
        for (FieldDefinition field : classDef.getFields()) {
            if (field.getFields() != null && !field.getFields().isEmpty()) {
                // 这是一个嵌套对象
                String nestedClassName = capitalize(field.getName());
                ClassDefinition nestedClass = new ClassDefinition();
                nestedClass.setClassName(nestedClassName);
                nestedClass.setFields(field.getFields());

                // 递归生成嵌套类
                generateClassFiles(nestedClass, classTypeDesc, config, files, className);
            }
        }
    }

    private String generateControllerContent(Api api, CodegenConfig config) {
        StringBuilder sb = new StringBuilder();

        // 文件头
        sb.append(getFileHeader(config));

        // 包声明
        String controllerPackage = getControllerPackage(config);
        sb.append("package ").append(controllerPackage).append(";\n\n");

        // 导入
        sb.append("import javax.ws.rs.*;\n");
        sb.append("import javax.validation.Valid;\n");

        // 导入 Response（如果存在）
        if (api.getResponse() != null) {
            sb.append("import ").append(getResponsePackage(config)).append(".").append(api.getResponse().getClassName()).append(";\n");
        }

        // 导入 Request（如果存在）
        if (api.getRequest() != null) {
            sb.append("import ").append(getRequestPackage(config)).append(".").append(api.getRequest().getClassName()).append(";\n");
        }
        sb.append("\n");

        // 类定义
        sb.append("/**\n * ").append(api.getDescription() != null ? api.getDescription() : api.getName()).append(" */\n");
        sb.append("@Path(\"").append(api.getPath()).append("\")\n");
        sb.append("public class ").append(getControllerClassName(api.getName())).append(" {\n\n");

        // 方法
        String httpMethodAnnotation = getHttpMethodAnnotation(api.getMethod());
        sb.append("    /**\n * ").append(api.getDescription() != null ? api.getDescription() : api.getName()).append(" */\n");
        sb.append("    @").append(httpMethodAnnotation).append("\n");
        sb.append("    @Consumes(MediaType.APPLICATION_JSON)\n");
        sb.append("    @Produces(MediaType.APPLICATION_JSON)\n");

        String responseType = api.getResponse() != null ? api.getResponse().getClassName() : "Void";

        // 根据参数风格生成参数
        String params = generateMethodParameters(api, config);
        sb.append("    public ").append(responseType).append(" ").append(getMethodName(api)).append("(").append(params).append(") {\n");
        sb.append("        // TODO: 实现业务逻辑\n");
        sb.append("        return null;\n");
        sb.append("    }\n");

        sb.append("}\n");

        return sb.toString();
    }

    /**
     * 生成方法参数
     */
    private String generateMethodParameters(Api api, CodegenConfig config) {
        StringBuilder sb = new StringBuilder();

        // 展开模式：参数分开写
        boolean hasParams = false;

            // 添加 JAX-RS 参数注解
            if (api.getRequest() != null && api.getRequest().getFields() != null) {
                for (FieldDefinition field : api.getRequest().getFields()) {
                    if (sb.length() > 0) {
                        sb.append(", ");
                    }

                    // 生成参数注解和校验注解
                    sb.append(generateFieldParameterAnnotation(field));

                    // 参数类型
                    String paramType = convertToJavaType(field.getType());
                    sb.append(paramType).append(" ").append(field.getName());
                    hasParams = true;
                }
            }

            // 添加 Request 对象（如果有非参数字段）
            if (api.getRequest() != null) {
                boolean hasRequestBody = false;
                for (FieldDefinition field : api.getRequest().getFields()) {
                    if (field.isRequestBody()) {
                        hasRequestBody = true;
                        break;
                    }
                }
                if (hasRequestBody) {
                    if (sb.length() > 0) {
                        sb.append(", ");
                    }
                    sb.append("@Valid ").append(api.getRequest().getClassName()).append(" req");
                }
            }

            if (!hasParams && (api.getRequest() == null || api.getRequest().getFields() == null || api.getRequest().getFields().isEmpty())) {
                // 无参数
                return "";
            }

        return sb.toString();
    }

    /**
     * 生成字段参数注解（用于展开模式）
     */
    private String generateFieldParameterAnnotation(FieldDefinition field) {
        StringBuilder sb = new StringBuilder();

        // 根据参数位置添加对应的注解
        if (field.isPathParam()) {
            sb.append("@PathParam(\"").append(field.getName()).append("\") ");
        } else if (field.isQueryParam()) {
            sb.append("@QueryParam(\"").append(field.getName()).append("\") ");
        } else if (field.isHeaderParam()) {
            sb.append("@HeaderParam(\"").append(field.getName()).append("\") ");
        } else if (field.isCookieParam()) {
            sb.append("@CookieParam(\"").append(field.getName()).append("\") ");
        }

        // 添加校验注解
        sb.append(generateValidationAnnotations(field));

        return sb.toString();
    }

    /**
     * 生成校验注解
     */
    private String generateValidationAnnotations(FieldDefinition field) {
        StringBuilder sb = new StringBuilder();
        ValidationConfig v = field.getValidation();

        if (v == null) {
            return "";
        }

        // @NotNull / @NotBlank
        if (field.isRequired()) {
            if ("String".equals(field.getType())) {
                sb.append("@NotBlank ");
            } else {
                sb.append("@NotNull ");
            }
        }

        // @Size (String 类型)
        if ("String".equals(field.getType())) {
            if (v.getMinLength() != null || v.getMaxLength() != null) {
                sb.append("@Size(");
                boolean hasMin = false;
                if (v.getMinLength() != null && v.getMinLength() > 0) {
                    sb.append("min=").append(v.getMinLength());
                    hasMin = true;
                }
                if (v.getMaxLength() != null) {
                    if (hasMin) sb.append(", ");
                    sb.append("max=").append(v.getMaxLength());
                }
                sb.append(") ");
            }
        }

        // @Min / @Max (数值类型)
        if ("Integer".equals(field.getType()) || "Long".equals(field.getType()) || "Double".equals(field.getType())) {
            if (v.getMin() != null) {
                sb.append("@Min(").append(v.getMin().intValue()).append(") ");
            }
            if (v.getMax() != null) {
                sb.append("@Max(").append(v.getMax().intValue()).append(") ");
            }
        }

        // @Pattern (正则)
        if (v.getPattern() != null && !v.getPattern().isEmpty()) {
            sb.append("@Pattern(regexp=\"").append(escapeRegex(v.getPattern())).append("\") ");
        }

        // @Email
        if (v.getEmail() != null && v.getEmail()) {
            sb.append("@Email ");
        }

        // @Past / @Future (日期)
        if ("LocalDate".equals(field.getType()) || "LocalDateTime".equals(field.getType())) {
            if (v.getPast() != null && v.getPast()) {
                sb.append("@Past ");
            }
            if (v.getFuture() != null && v.getFuture()) {
                sb.append("@Future ");
            }
        }

        return sb.toString();
    }

    /**
     * 转换类型为 Java 类型
     */
    private String convertToJavaType(String type) {
        if (type == null) return "String";
        switch (type) {
            case "integer": return "Integer";
            case "number": return "Double";
            case "boolean": return "Boolean";
            case "string": return "String";
            default: return type;
        }
    }

    private String generateClassContent(ClassDefinition classDef, String classTypeDesc,
                                         CodegenConfig config, String packageName) {
        StringBuilder sb = new StringBuilder();

        // 文件头
        sb.append(getFileHeader(config));

        // 包声明
        sb.append("package ").append(packageName).append(";\n\n");

        // 导入
        sb.append("import lombok.Data;\n");
        sb.append("import javax.validation.constraints.*;\n");
        sb.append("import java.time.LocalDate;\n");
        sb.append("import java.time.LocalDateTime;\n");
        sb.append("import java.util.List;\n\n");

        // 类定义
        sb.append("/**\n * ").append(classDef.getClassName()).append(" */\n");
        sb.append("@Data\n");
        sb.append("public class ").append(classDef.getClassName()).append(" {\n\n");

        // 字段
        for (FieldDefinition field : classDef.getFields()) {
            sb.append(generateField(field, config)).append("\n");
        }

        sb.append("}\n");

        return sb.toString();
    }

    private String generateField(FieldDefinition field, CodegenConfig config) {
        StringBuilder sb = new StringBuilder();
        sb.append("    /** ").append(field.getDescription()).append(" */\n");

        // 验证注解
        if (field.isRequired()) {
            sb.append("    @NotNull\n");
        }

        if (field.getValidation() != null) {
            ValidationConfig v = field.getValidation();
            if (v.getMinLength() != null || v.getMaxLength() != null) {
                sb.append("    @Size(");
                if (v.getMinLength() != null) {
                    sb.append("min = ").append(v.getMinLength());
                }
                if (v.getMaxLength() != null) {
                    if (v.getMinLength() != null) sb.append(", ");
                    sb.append("max = ").append(v.getMaxLength());
                }
                sb.append(")\n");
            }
            if (v.getMin() != null || v.getMax() != null) {
                sb.append("    @Min(").append(v.getMin() != null ? v.getMin() : 0).append(")\n");
                sb.append("    @Max(").append(v.getMax() != null ? v.getMax() : Integer.MAX_VALUE).append(")\n");
            }
            if (v.getMinSize() != null || v.getMaxSize() != null) {
                sb.append("    @Size(");
                if (v.getMinSize() != null) {
                    sb.append("min = ").append(v.getMinSize());
                }
                if (v.getMaxSize() != null) {
                    if (v.getMinSize() != null) sb.append(", ");
                    sb.append("max = ").append(v.getMaxSize());
                }
                sb.append(")\n");
            }
            if (Boolean.TRUE.equals(v.getEmail())) {
                sb.append("    @Email\n");
            }
            if (v.getPattern() != null && !v.getPattern().isEmpty()) {
                sb.append("    @Pattern(regexp = \"").append(escapeRegex(v.getPattern())).append("\")\n");
            }
            if (Boolean.TRUE.equals(v.getPast())) {
                sb.append("    @Past\n");
            }
            if (Boolean.TRUE.equals(v.getFuture())) {
                sb.append("    @Future\n");
            }
        }

        // 字段声明
        String javaType = getJavaType(field);
        sb.append("    private ").append(javaType).append(" ").append(field.getName()).append(";");

        return sb.toString();
    }

    private String getJavaType(FieldDefinition field) {
        String type = field.getType();
        if (type == null) return "Object";

        // 基本类型
        if (type.equals("Integer")) return "Integer";
        if (type.equals("Long")) return "Long";
        if (type.equals("Double")) return "Double";
        if (type.equals("Boolean")) return "Boolean";
        if (type.equals("Enum")) return "String";

        // 列表类型
        if (type.startsWith("List<")) return type;

        // 自定义对象类型（嵌套对象）
        if (field.getFields() != null && !field.getFields().isEmpty()) {
            return capitalize(field.getName());
        }

        return type;
    }

    private String getFileHeader(CodegenConfig config) {
        StringBuilder sb = new StringBuilder();
        sb.append("/**\n");

        // 获取用户配置的版权声明
        String copyright = config.getCopyright();
        if (copyright != null && !copyright.trim().isEmpty()) {
            sb.append(" * ").append(copyright.trim()).append("\n");
            sb.append(" *\n");
        }

        sb.append(" * 此文件由 api-codegen 自动生成，请勿手动修改\n");
        sb.append(" */\n\n");
        return sb.toString();
    }

    private String getControllerPackage(CodegenConfig config) {
        return getBasePackage(config) + ".api";
    }

    private String getRequestPackage(CodegenConfig config) {
        return getBasePackage(config) + ".req";
    }

    private String getResponsePackage(CodegenConfig config) {
        return getBasePackage(config) + ".rsp";
    }

    private String getBasePackage(CodegenConfig config) {
        return config != null && config.getBasePackage() != null && !config.getBasePackage().isEmpty()
            ? config.getBasePackage()
            : "com.apicgen";
    }

    private String getControllerClassName(String apiName) {
        if (apiName.startsWith("create")) return "CreateController";
        if (apiName.startsWith("update")) return "UpdateController";
        if (apiName.startsWith("delete")) return "DeleteController";
        if (apiName.startsWith("query") || apiName.startsWith("get")) return "QueryController";
        return capitalize(apiName) + "Controller";
    }

    private String getMethodName(Api api) {
        String name = api.getName();
        if (name.startsWith("create")) return "create";
        if (name.startsWith("update")) return "update";
        if (name.startsWith("delete")) return "delete";
        if (name.startsWith("query") || name.startsWith("get")) return "query";
        return name;
    }

    private String getHttpMethodAnnotation(Api.HttpMethod method) {
        switch (method) {
            case GET: return "GET";
            case POST: return "POST";
            case PUT: return "PUT";
            case DELETE: return "DELETE";
            case PATCH: return "PATCH";
            default: return "POST";
        }
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }

    /**
     * 生成统一的 Controller（包含所有 API 方法）
     */
    private String generateUnifiedControllerContent(ApiDefinition apiDefinition, CodegenConfig config, String className) {
        StringBuilder sb = new StringBuilder();

        // 文件头
        sb.append(getFileHeader(config));

        // 包声明
        String controllerPackage = getControllerPackage(config);
        sb.append("package ").append(controllerPackage).append(";\n\n");

        // 收集所有需要导入的类
        Set<String> importedRequestClasses = new HashSet<>();
        Set<String> importedResponseClasses = new HashSet<>();

        // 导入
        sb.append("import javax.ws.rs.*;\n");
        sb.append("import javax.validation.Valid;\n");

        for (Api api : apiDefinition.getApis()) {
            if (api.getResponse() != null) {
                importedResponseClasses.add(api.getResponse().getClassName());
            }
            if (api.getRequest() != null) {
                importedRequestClasses.add(api.getRequest().getClassName());
            }
        }

        // 输出导入
        for (String cls : importedResponseClasses) {
            sb.append("import ").append(getResponsePackage(config)).append(".").append(cls).append(";\n");
        }
        for (String cls : importedRequestClasses) {
            sb.append("import ").append(getRequestPackage(config)).append(".").append(cls).append(";\n");
        }
        sb.append("\n");

        // 类定义
        sb.append("/**\n");
        sb.append(" * 统一的 API 控制器\n");
        sb.append(" * 此文件由 api-codegen 自动生成，请勿手动修改\n");
        sb.append(" */\n");
        sb.append("@Path(\"/api\")\n");

        // 添加类级别自定义注解
        if (config.getCustomAnnotations() != null && config.getCustomAnnotations().getClassAnnotations() != null) {
            for (String annotation : config.getCustomAnnotations().getClassAnnotations()) {
                sb.append(annotation).append("\n");
            }
        }

        sb.append("public class ").append(className).append(" {\n\n");

        // 遍历所有 API，生成方法
        for (Api api : apiDefinition.getApis()) {
            sb.append(generateApiMethod(api, config));
            sb.append("\n");
        }

        sb.append("}\n");

        return sb.toString();
    }

    /**
     * 生成单个 API 方法
     */
    private String generateApiMethod(Api api, CodegenConfig config) {
        StringBuilder sb = new StringBuilder();

        sb.append("    /**\n");
        sb.append("     * ").append(api.getDescription() != null ? api.getDescription() : api.getName()).append("\n");
        sb.append("     */\n");

        // 添加方法级别自定义注解
        if (config.getCustomAnnotations() != null && config.getCustomAnnotations().getMethodAnnotations() != null) {
            for (String annotation : config.getCustomAnnotations().getMethodAnnotations()) {
                sb.append("    ").append(annotation).append("\n");
            }
        }

        // 添加 API 级别的自定义注解（来自接口yaml中的annotations字段）
        if (api.getAnnotations() != null && !api.getAnnotations().isEmpty()) {
            for (String annotation : api.getAnnotations()) {
                sb.append("    ").append(annotation).append("\n");
            }
        }

        // HTTP 方法注解
        String httpMethod = getHttpMethodAnnotation(api.getMethod());
        sb.append("    @").append(httpMethod).append("\n");
        sb.append("    @Path(\"").append(getRelativePath(api.getPath())).append("\")\n");
        sb.append("    @Consumes(MediaType.APPLICATION_JSON)\n");
        sb.append("    @Produces(MediaType.APPLICATION_JSON)\n");

        String responseType = api.getResponse() != null ? api.getResponse().getClassName() : "Void";
        String requestType = api.getRequest() != null ? api.getRequest().getClassName() : "Void";

        String methodName = getMethodName(api);
        if ("Void".equals(requestType)) {
            sb.append("    public ").append(responseType).append(" ").append(methodName).append("() {\n");
        } else {
            sb.append("    public ").append(responseType).append(" ").append(methodName).append("(@Valid ").append(requestType).append(" req) {\n");
        }
        sb.append("        // TODO: 实现业务逻辑\n");
        sb.append("        return null;\n");
        sb.append("    }");

        return sb.toString();
    }

    /**
     * 获取相对路径（去掉公共前缀）
     */
    private String getRelativePath(String fullPath) {
        if (fullPath == null) return "";
        // 去掉 /api 前缀，如果有的话
        if (fullPath.startsWith("/api")) {
            return fullPath.substring(4);
        }
        if (fullPath.startsWith("/")) {
            return fullPath;
        }
        return "/" + fullPath;
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
}
