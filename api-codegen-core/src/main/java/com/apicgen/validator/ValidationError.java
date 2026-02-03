package com.apicgen.validator;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 校验错误
 */
@Data
@AllArgsConstructor
public class ValidationError {

    /**
     * 字段路径
     */
    private String field;

    /**
     * 错误消息
     */
    private String message;

    public ValidationError(String message) {
        this.field = "";
        this.message = message;
    }
}
