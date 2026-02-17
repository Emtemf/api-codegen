package com.apicgen.model;

import lombok.Data;

import java.util.List;

/**
 * API 定义
 */
@Data
public class Api {

    /**
     * API 名称
     */
    private String name;

    /**
     * 请求路径
     */
    private String path;

    /**
     * HTTP 方法: GET, POST, PUT, DELETE, PATCH
     */
    private HttpMethod method;

    /**
     * 描述
     */
    private String description;

    /**
     * 请求定义
     */
    private ClassDefinition request;

    /**
     * 响应定义
     */
    private ClassDefinition response;

    /**
     * 自定义注解列表（应用于该API的方法）
     */
    private List<String> annotations;

    /**
     * 框架类型: cxf 或 spring
     * 如果未指定，则使用全局配置
     */
    private String framework;

    /**
     * HTTP 方法枚举
     */
    public enum HttpMethod {
        GET,
        POST,
        PUT,
        DELETE,
        PATCH
    }
}
