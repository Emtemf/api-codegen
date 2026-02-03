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
        sb.append("import ").append(getResponsePackage(config)).append(".").append(api.getResponse().getClassName()).append(";\n");
        sb.append("import ").append(getRequestPackage(config)).append(".").append(api.getRequest().getClassName()).append(";\n\n");

        // 类定义
        sb.append("/**\n * ").append(api.getDescription()).append(" */\n");
        sb.append("@Path(\"").append(api.getPath()).append("\")\n");
        sb.append("public class ").append(getControllerClassName(api.getName())).append(" {\n\n");

        // 方法
        String httpMethodAnnotation = getHttpMethodAnnotation(api.getMethod());
        sb.append("    /**\n     * ").append(api.getDescription()).append(" */\n");
        sb.append("    @").append(httpMethodAnnotation).append("\n");
        sb.append("    @Consumes(MediaType.APPLICATION_JSON)\n");
        sb.append("    @Produces(MediaType.APPLICATION_JSON)\n");
        sb.append("    public ").append(api.getResponse().getClassName()).append(" ")
          .append(getMethodName(api)).append("(@Valid ").append(api.getRequest().getClassName()).append(" req) {\n");
        sb.append("        // TODO: 实现业务逻辑\n");
        sb.append("        return null;\n");
        sb.append("    }\n");

        sb.append("}\n");

        return sb.toString();
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
                sb.append("    @Pattern(regexp = \"").append(v.getPattern()).append("\")\n");
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
        sb.append(" * Copyright (c) ");
        if (config.getCopyright() != null && config.getCopyright().getStartYear() != null) {
            sb.append(config.getCopyright().getStartYear());
        } else {
            sb.append("2024");
        }
        String company = "";
        if (config.getCopyright() != null && config.getCopyright().getCompany() != null) {
            company = config.getCopyright().getCompany();
        }
        if (!company.isEmpty()) {
            sb.append(" ").append(company);
        }
        sb.append(". All rights reserved.\n");
        sb.append(" *\n");
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
}
