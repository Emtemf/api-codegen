package com.apicgen.model;

import lombok.Data;

/**
 * 校验规则配置
 */
@Data
public class ValidationConfig {

    /**
     * 最小长度（String）
     */
    private Integer minLength;

    /**
     * 最大长度（String）
     */
    private Integer maxLength;

    /**
     * 正则表达式
     */
    private String pattern;

    /**
     * 是否是邮箱格式
     */
    private Boolean email;

    /**
     * 最小值（Integer/Long/Double）
     */
    private Double min;

    /**
     * 最大值（Integer/Long/Double）
     */
    private Double max;

    /**
     * 是否是过去日期
     */
    private Boolean past;

    /**
     * 是否是未来日期
     */
    private Boolean future;

    /**
     * 最小大小（List）
     */
    private Integer minSize;

    /**
     * 最大大小（List）
     */
    private Integer maxSize;

    /**
     * 元素校验（List 的元素类型校验）
     */
    private ElementValidationConfig elementValidation;
}
