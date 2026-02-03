package com.apicgen.model;

import lombok.Data;

/**
 * List 元素校验配置
 */
@Data
public class ElementValidationConfig {

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
}
