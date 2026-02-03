package com.apicgen.validator;

import lombok.Data;

import java.util.List;

/**
 * 校验结果
 */
@Data
public class ValidationResult {

    /**
     * 是否通过
     */
    private final boolean valid;

    /**
     * 错误列表
     */
    private final List<ValidationError> errors;

    public ValidationResult(boolean valid, List<ValidationError> errors) {
        this.valid = valid;
        this.errors = errors;
    }

    /**
     * 获取错误消息
     */
    public String getErrorMessage() {
        if (errors == null || errors.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (ValidationError error : errors) {
            sb.append("✗ 校验失败: ").append(error.getField())
              .append(" - ").append(error.getMessage()).append("\n");
        }
        return sb.toString();
    }
}
