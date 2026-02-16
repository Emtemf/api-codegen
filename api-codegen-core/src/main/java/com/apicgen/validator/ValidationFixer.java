package com.apicgen.validator;

import com.apicgen.model.*;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;

import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;

/**
 * 校验规则自动修复器
 * 根据分析结果生成修复后的 YAML 内容
 */
public class ValidationFixer {

    private final ObjectMapper yamlMapper;

    public ValidationFixer() {
        this.yamlMapper = new ObjectMapper(new YAMLFactory());
        // 不输出 null 值
        this.yamlMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        // 启用美化输出
        this.yamlMapper.enable(SerializationFeature.INDENT_OUTPUT);
        // 不使用科学计数法输出数字
        this.yamlMapper.enable(JsonGenerator.Feature.WRITE_BIGDECIMAL_AS_PLAIN);
    }

    /**
     * 分析并自动修复，返回修复后的 YAML 内容
     */
    public String fix(ApiDefinition apiDefinition, List<ValidationAnalyzer.AnalysisItem> issues) {
        // 深拷贝 ApiDefinition 以避免修改原始对象
        ApiDefinition fixed = deepCopy(apiDefinition);

        // 应用修复
        applyFixes(fixed, issues);

        // 生成 YAML
        try {
            StringWriter writer = new StringWriter();
            yamlMapper.writeValue(writer, fixed);
            return writer.toString();
        } catch (Exception e) {
            throw new RuntimeException("生成 YAML 失败: " + e.getMessage(), e);
        }
    }

    /**
     * 应用修复到 ApiDefinition
     */
    private void applyFixes(ApiDefinition apiDefinition, List<ValidationAnalyzer.AnalysisItem> issues) {
        for (Api api : apiDefinition.getApis()) {
            fixApi(api, issues);
        }
    }

    /**
     * 修复单个 API
     */
    private void fixApi(Api api, List<ValidationAnalyzer.AnalysisItem> issues) {
        // 过滤出与当前 API 相关的问题
        List<ValidationAnalyzer.AnalysisItem> apiIssues = issues.stream()
                .filter(i -> i.getApiName().equals(api.getName()))
                .toList();

        // 修复 Request
        if (api.getRequest() != null) {
            fixClassDefinition(api.getRequest(), apiIssues, "request");
        }

        // 修复 Response
        if (api.getResponse() != null) {
            fixClassDefinition(api.getResponse(), apiIssues, "response");
        }
    }

    /**
     * 修复类定义
     */
    private void fixClassDefinition(ClassDefinition classDef, List<ValidationAnalyzer.AnalysisItem> issues, String location) {
        List<ValidationAnalyzer.AnalysisItem> classIssues = issues.stream()
                .filter(i -> location.equals(i.getLocation()) && classDef.getClassName().equals(i.getClassName()))
                .toList();

        for (FieldDefinition field : classDef.getFields()) {
            fixField(field, classIssues, classDef.getClassName(), location);
        }
    }

    /**
     * 修复字段
     */
    private void fixField(FieldDefinition field, List<ValidationAnalyzer.AnalysisItem> issues,
                         String className, String location) {
        String fieldName = field.getName();

        // 找到与当前字段相关的问题
        List<ValidationAnalyzer.AnalysisItem> fieldIssues = issues.stream()
                .filter(i -> fieldName.equals(i.getFieldName()))
                .toList();

        // 如果没有校验配置，创建新的
        if (field.getValidation() == null) {
            field.setValidation(new ValidationConfig());
        }

        ValidationConfig validation = field.getValidation();

        for (ValidationAnalyzer.AnalysisItem issue : fieldIssues) {
            applyFix(validation, issue);
        }

        // 递归修复嵌套字段
        if (field.getFields() != null) {
            for (FieldDefinition nestedField : field.getFields()) {
                fixField(nestedField, issues, className + "." + fieldName, location);
            }
        }
    }

    /**
     * 应用单个修复
     */
    private void applyFix(ValidationConfig validation, ValidationAnalyzer.AnalysisItem issue) {
        String issueText = issue.getIssue();

        switch (issueText) {
            // String 字段修复
            case "String 字段缺少长度校验":
                if (validation.getMinLength() == null) {
                    validation.setMinLength(1);
                }
                if (validation.getMaxLength() == null) {
                    validation.setMaxLength(255);
                }
                break;

            case "String 字段只有 minLength，缺少 maxLength":
                validation.setMaxLength(255);
                break;

            case "String 字段只有 maxLength，缺少 minLength":
                validation.setMinLength(1);
                break;

            case "邮箱字段建议添加 email 校验":
                validation.setEmail(true);
                break;

            case "电话字段建议添加正则校验":
                if (fieldNameLikelyPhone(issue.getFieldName())) {
                    // 支持手机号：+86/86开头，可选带空格或横线
                    validation.setPattern("^(\\+86|86)?1[3-9]\\d{9}$");
                }
                break;

            // 数字字段修复
            case "数值字段缺少范围校验":
                if (validation.getMin() == null) {
                    validation.setMin(0.0);
                }
                if (validation.getMax() == null) {
                    validation.setMax(getDefaultMax(issue.getFieldType()));
                }
                break;

            case "数值字段只有 min，缺少 max":
                validation.setMax(getDefaultMax(issue.getFieldType()));
                break;

            case "数值字段只有 max，缺少 min":
                validation.setMin(0.0);
                break;

            // 路径参数修复
            case "路径参数缺少最小值校验":
                validation.setMin(1.0);
                break;

            case "路径参数缺少最小长度校验":
                validation.setMinLength(1);
                break;

            // 页码字段修复
            case "页码字段缺少范围校验":
            case "页码字段缺少 min 校验":
                validation.setMin(1.0);
                validation.setMax(2147483647.0);
                break;

            case "页码字段缺少 max 校验":
                validation.setMin(1.0);
                validation.setMax(2147483647.0);
                break;

            // 每页数量字段修复
            case "每页数量字段缺少范围校验":
            case "每页数量字段缺少 min 校验":
                validation.setMin(1.0);
                validation.setMax(100.0);
                break;

            case "每页数量字段缺少 max 校验":
                validation.setMin(1.0);
                validation.setMax(100.0);
                break;

            // List 字段修复
            case "List 字段缺少大小校验":
                validation.setMinSize(1);
                validation.setMaxSize(100);
                break;

            case "List 字段只有 minSize，缺少 maxSize":
                validation.setMaxSize(100);
                break;

            case "List 字段只有 maxSize，缺少 minSize":
                validation.setMinSize(1);
                break;

            // 日期字段修复
            case "生日字段建议添加 past 校验":
                validation.setPast(true);
                break;

            case "预约字段建议添加 future 校验":
                validation.setFuture(true);
                break;
        }
    }

    /**
     * 根据字段名判断是否是电话号码
     */
    private boolean fieldNameLikelyPhone(String fieldName) {
        String lower = fieldName.toLowerCase();
        return lower.contains("phone") || lower.contains("mobile") || lower.contains("tel");
    }

    /**
     * 获取数字类型的默认值 max
     */
    private Double getDefaultMax(String fieldType) {
        return switch (fieldType) {
            case "Integer", "Long" -> 2147483647.0;
            case "Double" -> 9999999999.0;
            default -> 255.0;
        };
    }

    /**
     * 深拷贝 ApiDefinition
     */
    @SuppressWarnings("unchecked")
    private ApiDefinition deepCopy(ApiDefinition original) {
        ApiDefinition copy = new ApiDefinition();
        copy.setApis(new ArrayList<>());

        for (Api api : original.getApis()) {
            Api apiCopy = new Api();
            apiCopy.setName(api.getName());
            apiCopy.setPath(api.getPath());
            apiCopy.setMethod(api.getMethod());
            apiCopy.setDescription(api.getDescription());

            if (api.getRequest() != null) {
                apiCopy.setRequest(deepCopyClassDefinition(api.getRequest()));
            }
            if (api.getResponse() != null) {
                apiCopy.setResponse(deepCopyClassDefinition(api.getResponse()));
            }

            copy.getApis().add(apiCopy);
        }

        return copy;
    }

    /**
     * 深拷贝 ClassDefinition
     */
    private ClassDefinition deepCopyClassDefinition(ClassDefinition original) {
        ClassDefinition copy = new ClassDefinition();
        copy.setClassName(original.getClassName());
        copy.setFields(deepCopyFields(original.getFields()));
        return copy;
    }

    /**
     * 深拷贝字段列表
     */
    private List<FieldDefinition> deepCopyFields(List<FieldDefinition> original) {
        if (original == null) {
            return null;
        }
        List<FieldDefinition> copy = new ArrayList<>();
        for (FieldDefinition field : original) {
            FieldDefinition fieldCopy = new FieldDefinition();
            fieldCopy.setName(field.getName());
            fieldCopy.setType(field.getType());
            fieldCopy.setRequired(field.isRequired());
            fieldCopy.setDescription(field.getDescription());

            if (field.getValidation() != null) {
                fieldCopy.setValidation(deepCopyValidation(field.getValidation()));
            }

            if (field.getFields() != null) {
                fieldCopy.setFields(deepCopyFields(field.getFields()));
            }

            if (field.getEnumValues() != null) {
                fieldCopy.setEnumValues(new ArrayList<>(field.getEnumValues()));
            }

            copy.add(fieldCopy);
        }
        return copy;
    }

    /**
     * 深拷贝 ValidationConfig
     */
    private ValidationConfig deepCopyValidation(ValidationConfig original) {
        ValidationConfig copy = new ValidationConfig();
        copy.setMinLength(original.getMinLength());
        copy.setMaxLength(original.getMaxLength());
        copy.setPattern(original.getPattern());
        copy.setEmail(original.getEmail());
        copy.setMin(original.getMin());
        copy.setMax(original.getMax());
        copy.setPast(original.getPast());
        copy.setFuture(original.getFuture());
        copy.setMinSize(original.getMinSize());
        copy.setMaxSize(original.getMaxSize());

        if (original.getElementValidation() != null) {
            copy.setElementValidation(new ElementValidationConfig());
            copy.getElementValidation().setMinLength(original.getElementValidation().getMinLength());
            copy.getElementValidation().setMaxLength(original.getElementValidation().getMaxLength());
        }

        return copy;
    }
}
