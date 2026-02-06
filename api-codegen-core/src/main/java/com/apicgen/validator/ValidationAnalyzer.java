package com.apicgen.validator;

import com.apicgen.model.Api;
import com.apicgen.model.ApiDefinition;
import com.apicgen.model.ClassDefinition;
import com.apicgen.model.FieldDefinition;
import com.apicgen.model.ValidationConfig;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 校验规则分析器
 * 分析 YAML 中缺失的校验规则，并提供修复建议
 */
public class ValidationAnalyzer {

    /**
     * 分析结果项
     */
    public static class AnalysisItem {
        private String apiName;
        private String location;  // request/response
        private String className;
        private String fieldName;
        private String fieldType;
        private String issue;
        private String suggestion;
        private Severity severity;

        public enum Severity {
            ERROR,     // 严重问题，如缺少必填校验
            WARNING,   // 警告，建议添加
            INFO       // 信息性建议
        }

        public AnalysisItem(String apiName, String location, String className,
                           String fieldName, String fieldType, String issue, String suggestion, Severity severity) {
            this.apiName = apiName;
            this.location = location;
            this.className = className;
            this.fieldName = fieldName;
            this.fieldType = fieldType;
            this.issue = issue;
            this.suggestion = suggestion;
            this.severity = severity;
        }

        // Getters
        public String getApiName() { return apiName; }
        public String getLocation() { return location; }
        public String getClassName() { return className; }
        public String getFieldName() { return fieldName; }
        public String getFieldType() { return fieldType; }
        public String getIssue() { return issue; }
        public String getSuggestion() { return suggestion; }
        public Severity getSeverity() { return severity; }

        @Override
        public String toString() {
            String icon = switch (severity) {
                case ERROR -> "[ERROR]";
                case WARNING -> "[WARN]";
                case INFO -> "[INFO]";
            };
            return String.format("%s %s.%s (%s): %s - %s",
                    icon, className, fieldName, fieldType, issue, suggestion);
        }
    }

    /**
     * 分析整个 API 定义，返回缺失的校验规则列表
     */
    public List<AnalysisItem> analyze(ApiDefinition apiDefinition) {
        List<AnalysisItem> items = new ArrayList<>();

        for (Api api : apiDefinition.getApis()) {
            analyzeApi(api, items);
        }

        return items;
    }

    /**
     * 统计问题数量
     */
    public AnalysisSummary summarize(ApiDefinition apiDefinition) {
        List<AnalysisItem> items = analyze(apiDefinition);
        return new AnalysisSummary(
                items.stream().filter(i -> i.getSeverity() == AnalysisItem.Severity.ERROR).count(),
                items.stream().filter(i -> i.getSeverity() == AnalysisItem.Severity.WARNING).count(),
                items.stream().filter(i -> i.getSeverity() == AnalysisItem.Severity.INFO).count(),
                items.size()
        );
    }

    /**
     * 分析单个 API
     */
    private void analyzeApi(Api api, List<AnalysisItem> items) {
        String apiName = api.getName();

        // 分析 Request
        if (api.getRequest() != null) {
            analyzeClassDefinition(apiName, "request", api.getRequest(), items);
        }

        // 分析 Response
        if (api.getResponse() != null) {
            analyzeClassDefinition(apiName, "response", api.getResponse(), items);
        }
    }

    /**
     * 分析类定义
     */
    private void analyzeClassDefinition(String apiName, String location, ClassDefinition classDef, List<AnalysisItem> items) {
        String className = classDef.getClassName();

        for (FieldDefinition field : classDef.getFields()) {
            analyzeField(apiName, location, className, field, items);
        }
    }

    /**
     * 分析单个字段
     */
    private void analyzeField(String apiName, String location, String className,
                             FieldDefinition field, List<AnalysisItem> items) {
        String fieldName = field.getName();
        String fieldType = field.getType();
        ValidationConfig validation = field.getValidation();

        // 1. 检查必填字段是否有 @NotNull/@NotBlank 校验
        if (field.isRequired()) {
            if (validation == null || (!isNotNullValidated(validation) && !isNotBlankValidated(validation))) {
                items.add(new AnalysisItem(
                        apiName, location, className, fieldName, fieldType,
                        "必填字段缺少 @NotNull/@NotBlank 校验",
                        "添加 validation.required=true 或 @NotNull 注解",
                        AnalysisItem.Severity.ERROR
                ));
            }
        }

        // 2. 智能识别：邮箱字段
        if (isEmailField(fieldName) && field.isPrimitiveType() && "String".equals(getCleanType(fieldType))) {
            if (validation == null || validation.getEmail() == null) {
                items.add(new AnalysisItem(
                        apiName, location, className, fieldName, fieldType,
                        "邮箱字段建议添加 email 校验",
                        "添加 validation.email=true",
                        AnalysisItem.Severity.INFO
                ));
            }
        }

        // 3. 智能识别：电话字段
        if (isPhoneField(fieldName) && field.isPrimitiveType() && "String".equals(getCleanType(fieldType))) {
            if (validation == null || validation.getPattern() == null) {
                items.add(new AnalysisItem(
                        apiName, location, className, fieldName, fieldType,
                        "电话字段建议添加正则校验",
                        "添加 validation.pattern=\"^1[3-9]\\\\d{9}$\" 等",
                        AnalysisItem.Severity.INFO
                ));
            }
        }

        // 4. 根据类型检查特定的校验规则
        if (field.isListType()) {
            // List 类型（包括 List<String>, List<Long> 等）
            analyzeListField(apiName, location, className, fieldName, fieldType, validation, items);
        } else if (field.isPrimitiveType()) {
            // 基本类型（不包括 List）
            String cleanType = getCleanType(fieldType);
            switch (cleanType) {
                case "String":
                    analyzeStringField(apiName, location, className, fieldName, fieldType, validation, items);
                    break;
                case "Integer":
                case "Long":
                case "Double":
                    analyzeNumericField(apiName, location, className, fieldName, fieldType, validation, items);
                    break;
                case "LocalDate":
                case "LocalDateTime":
                    analyzeDateField(apiName, location, className, fieldName, fieldType, validation, items);
                    break;
            }
        }

        // 5. 嵌套对象递归分析
        if (field.getFields() != null && !field.getFields().isEmpty()) {
            for (FieldDefinition nestedField : field.getFields()) {
                analyzeField(apiName, location, className + "." + fieldName, nestedField, items);
            }
        }
    }

    /**
     * 获取清理后的类型字符串（去掉引号和空格）
     */
    private String getCleanType(String type) {
        if (type == null) return null;
        return type.replace("\"", "").trim();
    }

    /**
     * 判断是否为邮箱字段
     */
    private boolean isEmailField(String fieldName) {
        String lower = fieldName.toLowerCase();
        return lower.contains("email") || lower.contains("mail");
    }

    /**
     * 判断是否为电话字段
     */
    private boolean isPhoneField(String fieldName) {
        String lower = fieldName.toLowerCase();
        return lower.contains("phone") || lower.contains("mobile") || lower.contains("tel");
    }

    /**
     * 分析 String 类型字段
     */
    private void analyzeStringField(String apiName, String location, String className,
                                   String fieldName, String fieldType,
                                   ValidationConfig validation, List<AnalysisItem> items) {
        if (validation == null) {
            // 没有校验配置，建议添加
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "String 字段缺少长度校验",
                    "建议添加 validation.minLength 和 validation.maxLength",
                    AnalysisItem.Severity.WARNING
            ));
            return;
        }

        // 检查 minLength 和 maxLength
        if (validation.getMinLength() == null && validation.getMaxLength() == null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "String 字段缺少长度校验",
                    "建议添加 validation.minLength 和 validation.maxLength",
                    AnalysisItem.Severity.WARNING
            ));
        } else if (validation.getMinLength() != null && validation.getMaxLength() == null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "String 字段只有 minLength，缺少 maxLength",
                    "建议添加 validation.maxLength",
                    AnalysisItem.Severity.INFO
            ));
        } else if (validation.getMinLength() == null && validation.getMaxLength() != null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "String 字段只有 maxLength，缺少 minLength",
                    "建议添加 validation.minLength",
                    AnalysisItem.Severity.INFO
            ));
        }

        // 检查 minLength > maxLength
        if (validation.getMinLength() != null && validation.getMaxLength() != null
                && validation.getMinLength() > validation.getMaxLength()) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "minLength 不能大于 maxLength",
                    "修改 validation.minLength < validation.maxLength",
                    AnalysisItem.Severity.ERROR
            ));
        }

        // 检查 email 格式
        if (validation.getEmail() == null) {
            // 通过字段名判断是否可能是邮箱
            if (fieldName.toLowerCase().contains("email") || fieldName.toLowerCase().contains("mail")) {
                items.add(new AnalysisItem(
                        apiName, location, className, fieldName, fieldType,
                        "邮箱字段建议添加 email 校验",
                        "添加 validation.email=true",
                        AnalysisItem.Severity.INFO
                ));
            }
        }

        // 检查 pattern
        if (validation.getPattern() == null && fieldName.toLowerCase().contains("phone")) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "电话字段建议添加正则校验",
                    "添加 validation.pattern=\"^1[3-9]\\\\d{9}$\" 等",
                    AnalysisItem.Severity.INFO
            ));
        }
    }

    /**
     * 分析数字类型字段
     */
    private void analyzeNumericField(String apiName, String location, String className,
                                    String fieldName, String fieldType,
                                    ValidationConfig validation, List<AnalysisItem> items) {
        if (validation == null) {
            // 没有校验配置
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "数值字段缺少范围校验",
                    "建议添加 validation.min 和 validation.max",
                    AnalysisItem.Severity.WARNING
            ));
            return;
        }

        // 检查 min 和 max
        if (validation.getMin() == null && validation.getMax() == null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "数值字段缺少范围校验",
                    "建议添加 validation.min 和 validation.max",
                    AnalysisItem.Severity.WARNING
            ));
        } else if (validation.getMin() != null && validation.getMax() == null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "数值字段只有 min，缺少 max",
                    "建议添加 validation.max",
                    AnalysisItem.Severity.INFO
            ));
        } else if (validation.getMin() == null && validation.getMax() != null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "数值字段只有 max，缺少 min",
                    "建议添加 validation.min",
                    AnalysisItem.Severity.INFO
            ));
        }

        // 检查 min > max
        if (validation.getMin() != null && validation.getMax() != null
                && validation.getMin() > validation.getMax()) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "min 不能大于 max",
                    "修改 validation.min < validation.max",
                    AnalysisItem.Severity.ERROR
            ));
        }

        // 检查 min < 0（对于非负数）
        if (validation.getMin() != null && validation.getMin() < 0) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "数值字段 min 建议 >= 0",
                    "对于非负数，validation.min 建议设置为 0",
                    AnalysisItem.Severity.INFO
            ));
        }
    }

    /**
     * 分析日期类型字段
     */
    private void analyzeDateField(String apiName, String location, String className,
                                 String fieldName, String fieldType,
                                 ValidationConfig validation, List<AnalysisItem> items) {
        if (validation == null) {
            // 检查字段名判断是生日还是时间
            if (fieldName.toLowerCase().contains("birth") || fieldName.toLowerCase().contains("dob")) {
                items.add(new AnalysisItem(
                        apiName, location, className, fieldName, fieldType,
                        "生日字段建议添加 past 校验",
                        "添加 validation.past=true（只能是过去日期）",
                        AnalysisItem.Severity.INFO
                ));
            } else if (fieldName.toLowerCase().contains("appoint") || fieldName.toLowerCase().contains("schedule")) {
                items.add(new AnalysisItem(
                        apiName, location, className, fieldName, fieldType,
                        "预约字段建议添加 future 校验",
                        "添加 validation.future=true（只能是未来日期）",
                        AnalysisItem.Severity.INFO
                ));
            }
            return;
        }

        // 同时存在 past 和 future
        if (validation.getPast() != null && validation.getPast()
                && validation.getFuture() != null && validation.getFuture()) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "past 和 future 不能同时为 true",
                    "修改 validation.past 或 validation.future",
                    AnalysisItem.Severity.ERROR
            ));
        }
    }

    /**
     * 分析 List 类型字段
     */
    private void analyzeListField(String apiName, String location, String className,
                                 String fieldName, String fieldType,
                                 ValidationConfig validation, List<AnalysisItem> items) {
        if (validation == null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "List 字段缺少大小校验",
                    "建议添加 validation.minSize 和 validation.maxSize",
                    AnalysisItem.Severity.WARNING
            ));
            return;
        }

        if (validation.getMinSize() == null && validation.getMaxSize() == null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "List 字段缺少大小校验",
                    "建议添加 validation.minSize 和 validation.maxSize",
                    AnalysisItem.Severity.WARNING
            ));
        } else if (validation.getMinSize() != null && validation.getMaxSize() == null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "List 字段只有 minSize，缺少 maxSize",
                    "建议添加 validation.maxSize",
                    AnalysisItem.Severity.INFO
            ));
        } else if (validation.getMinSize() == null && validation.getMaxSize() != null) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "List 字段只有 maxSize，缺少 minSize",
                    "建议添加 validation.minSize",
                    AnalysisItem.Severity.INFO
            ));
        }

        // 检查 minSize > maxSize
        if (validation.getMinSize() != null && validation.getMaxSize() != null
                && validation.getMinSize() > validation.getMaxSize()) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "minSize 不能大于 maxSize",
                    "修改 validation.minSize < validation.maxSize",
                    AnalysisItem.Severity.ERROR
            ));
        }

        // 检查 maxSize <= 0
        if (validation.getMaxSize() != null && validation.getMaxSize() <= 0) {
            items.add(new AnalysisItem(
                    apiName, location, className, fieldName, fieldType,
                    "maxSize 必须 > 0",
                    "修改 validation.maxSize > 0",
                    AnalysisItem.Severity.ERROR
            ));
        }
    }

    /**
     * 检查是否有 @NotNull 校验
     */
    private boolean isNotNullValidated(ValidationConfig validation) {
        // 在当前模型中，required 字段通过 FieldDefinition.required 标记
        // 实际校验时需要配合 @NotNull 或 @NotBlank 注解
        // 这里我们返回 false，表示需要在 validation 中添加相应配置
        return false;
    }

    /**
     * 检查是否有 @NotBlank 校验
     */
    private boolean isNotBlankValidated(ValidationConfig validation) {
        return false;
    }

    /**
     * 分析摘要
     */
    public static class AnalysisSummary {
        private final long errorCount;
        private final long warningCount;
        private final long infoCount;
        private final long totalCount;

        public AnalysisSummary(long errorCount, long warningCount, long infoCount, long totalCount) {
            this.errorCount = errorCount;
            this.warningCount = warningCount;
            this.infoCount = infoCount;
            this.totalCount = totalCount;
        }

        public long getErrorCount() { return errorCount; }
        public long getWarningCount() { return warningCount; }
        public long getInfoCount() { return infoCount; }
        public long getTotalCount() { return totalCount; }

        public boolean hasIssues() { return totalCount > 0; }
        public boolean hasErrors() { return errorCount > 0; }
    }
}
