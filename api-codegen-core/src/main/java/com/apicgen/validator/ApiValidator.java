package com.apicgen.validator;

import com.apicgen.model.*;
import com.apicgen.util.CodeGenUtil;

import java.util.*;

/**
 * YAML 校验器
 */
public class ApiValidator {

    // Use ThreadLocal for thread safety
    private final ThreadLocal<List<ValidationError>> errors = ThreadLocal.withInitial(ArrayList::new);

    /**
     * 校验 API 定义
     */
    public ValidationResult validate(ApiDefinition apiDefinition) {
        errors.get().clear();

        if (apiDefinition == null) {
            errors.get().add(new ValidationError("api", "API 定义不能为空"));
            return new ValidationResult(false, errors.get());
        }

        List<Api> apis = apiDefinition.getApis();
        if (apis == null || apis.isEmpty()) {
            errors.get().add(new ValidationError("apis", "API 列表不能为空"));
            return new ValidationResult(false, errors.get());
        }

        // 检查同名 API
        checkDuplicateApi(apis);

        // 校验每个 API
        for (int i = 0; i < apis.size(); i++) {
            validateApi(apis.get(i), "apis[" + i + "]");
        }

        return new ValidationResult(errors.get().isEmpty(), errors.get());
    }

    /**
     * Clean up ThreadLocal after use
     */
    public void cleanup() {
        errors.remove();
    }

    /**
     * 检查同名 API
     */
    private void checkDuplicateApi(List<Api> apis) {
        Map<String, Api> apiMap = new HashMap<>();
        for (Api api : apis) {
            String key = api.getPath() + ":" + api.getMethod();
            if (apiMap.containsKey(key)) {
                errors.get().add(new ValidationError(
                    "api." + api.getName(),
                    "API " + key + " 与 " + apiMap.get(key).getName() + " 重复"
                ));
            }
            apiMap.put(key, api);
        }
    }

    /**
     * 校验单个 API
     */
    private void validateApi(Api api, String prefix) {
        if (api.getName() == null || api.getName().isBlank()) {
            errors.get().add(new ValidationError(
                prefix + ".name",
                "API 名称不能为空",
                null,
                "API 名称是必需的，请提供有效的名称"
            ));
        }

        if (api.getPath() == null || api.getPath().isBlank()) {
            errors.get().add(new ValidationError(
                prefix + ".path",
                "API 路径不能为空",
                null,
                "API 路径是必需的，例如: /api/users"
            ));
        } else if (!api.getPath().startsWith("/")) {
            errors.get().add(new ValidationError(
                prefix + ".path",
                "API 路径必须以 / 开头",
                api.getPath(),
                "路径应以 / 开头，例如: /api/users"
            ));
        }

        if (api.getMethod() == null) {
            errors.get().add(new ValidationError(
                prefix + ".method",
                "HTTP 方法不能为空",
                null,
                "HTTP 方法必须是以下之一: GET, POST, PUT, DELETE, PATCH"
            ));
        }

        // 校验 Request
        if (api.getRequest() != null) {
            validateClassDefinition(api.getRequest(), prefix + ".request");
        }

        // 校验 Response
        if (api.getResponse() != null) {
            validateClassDefinition(api.getResponse(), prefix + ".response");
        }
    }

    /**
     * 校验类定义
     */
    private void validateClassDefinition(ClassDefinition classDef, String prefix) {
        if (classDef.getClassName() == null || classDef.getClassName().isBlank()) {
            errors.get().add(new ValidationError(prefix + ".className", "类名不能为空"));
        }

        if (classDef.getFields() != null) {
            for (int i = 0; i < classDef.getFields().size(); i++) {
                FieldDefinition field = classDef.getFields().get(i);
                validateField(field, prefix + ".fields[" + i + "]");
            }
        }
    }

    /**
     * 校验字段
     */
    private void validateField(FieldDefinition field, String prefix) {
        if (field.getName() == null || field.getName().isBlank()) {
            errors.get().add(new ValidationError(prefix + ".name", "字段名不能为空"));
        }

        if (field.getType() == null || field.getType().isBlank()) {
            errors.get().add(new ValidationError(prefix + ".type", "字段类型不能为空"));
            // 类型为空时，跳过需要type的后续校验
            return;
        }

        // 检查循环引用
        if (CodeGenUtil.hasCircularReference(field)) {
            errors.get().add(new ValidationError(prefix, "字段 " + field.getName() + " 存在循环引用"));
        }

        // 校验验证规则
        if (field.getValidation() != null) {
            validateValidation(field.getValidation(), field.getType(), prefix + ".validation");
        }

        // 校验枚举值
        if (field.isEnumType()) {
            if (field.getEnumValues() == null || field.getEnumValues().isEmpty()) {
                errors.get().add(new ValidationError(prefix + ".enumValues", "枚举类型必须指定 enumValues"));
            }
        }
    }

    /**
     * 校验验证规则
     */
    private void validateValidation(ValidationConfig validation, String fieldType, String prefix) {
        if (fieldType == null) {
            return; // 类型为null时跳过校验
        }

        // String 类型的校验
        if ("String".equals(fieldType) || fieldType.startsWith("String")) {
            if (validation.getMinLength() != null && validation.getMinLength() < 0) {
                errors.get().add(new ValidationError(prefix + ".minLength", "minLength 不能小于 0"));
            }
            if (validation.getMaxLength() != null && validation.getMaxLength() < 0) {
                errors.get().add(new ValidationError(prefix + ".maxLength", "maxLength 不能小于 0"));
            }
            if (validation.getMinLength() != null && validation.getMaxLength() != null
                && validation.getMinLength() > validation.getMaxLength()) {
                errors.get().add(new ValidationError(prefix, "minLength 不能大于 maxLength"));
            }
        }

        // 数值类型的校验
        if (isNumericType(fieldType)) {
            if (validation.getMin() != null && validation.getMin() < 0) {
                errors.get().add(new ValidationError(prefix + ".min", "min 不能小于 0（DFX 建议）"));
            }
            if (validation.getMax() != null && validation.getMin() != null
                && validation.getMax() <= validation.getMin()) {
                errors.get().add(new ValidationError(prefix, "max 必须大于 min"));
            }
        }

        // List 类型的校验
        if (fieldType != null && fieldType.startsWith("List<")) {
            if (validation.getMinSize() != null && validation.getMinSize() < 0) {
                errors.get().add(new ValidationError(prefix + ".minSize", "minSize 不能小于 0"));
            }
            if (validation.getMaxSize() != null && validation.getMaxSize() <= 0) {
                errors.get().add(new ValidationError(prefix + ".maxSize", "maxSize 不能小于等于 0（DFX 要求）"));
            }
            if (validation.getMinSize() != null && validation.getMaxSize() != null
                && validation.getMinSize() > validation.getMaxSize()) {
                errors.get().add(new ValidationError(prefix, "minSize 不能大于 maxSize"));
            }
        }
    }

    /**
     * 是否是数值类型
     */
    private boolean isNumericType(String type) {
        return "Integer".equals(type) || "Long".equals(type) || "Double".equals(type);
    }
}
