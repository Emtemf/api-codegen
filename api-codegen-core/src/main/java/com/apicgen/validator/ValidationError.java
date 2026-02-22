package com.apicgen.validator;

import lombok.Data;

/**
 * 校验错误
 */
@Data
public class ValidationError {

    /**
     * 字段路径
     */
    private String field;

    /**
     * 错误消息
     */
    private String message;

    /**
     * 实际值（可选）
     */
    private String actualValue;

    /**
     * 修复建议（可选）
     */
    private String suggestion;

    public ValidationError(String message) {
        this.field = "";
        this.message = message;
    }

    public ValidationError(String field, String message) {
        this.field = field;
        this.message = message;
    }

    public ValidationError(String field, String message, String actualValue, String suggestion) {
        this.field = field;
        this.message = message;
        this.actualValue = actualValue;
        this.suggestion = suggestion;
    }
}
