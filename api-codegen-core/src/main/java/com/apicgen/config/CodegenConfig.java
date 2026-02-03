package com.apicgen.config;

import lombok.Data;

import java.util.Map;

/**
 * 代码生成配置
 */
@Data
public class CodegenConfig {

    /**
     * 框架类型: cxf, spring
     */
    private FrameworkType framework = FrameworkType.CXF;

    /**
     * 基础包名（用于生成代码的包路径）
     */
    private String basePackage = "com.apicgen";

    /**
     * 版权配置
     */
    private CopyrightConfig copyright;

    /**
     * OpenAPI 配置
     */
    private OpenApiConfig openApi;

    /**
     * 输出配置
     */
    private OutputConfig output;

    /**
     * 项目配置（多项目）
     */
    private Map<String, ProjectConfig> projects;

    /**
     * 框架类型枚举
     */
    public enum FrameworkType {
        CXF,
        SPRING
    }

    /**
     * 版权配置
     */
    @Data
    public static class CopyrightConfig {
        /**
         * 公司名称（可配置，为空时使用默认值或省略）
         */
        private String company = "";

        /**
         * 开始年份
         */
        private Integer startYear;
    }

    /**
     * OpenAPI 配置
     */
    @Data
    public static class OpenApiConfig {
        /**
         * 是否启用
         */
        private boolean enabled = false;

        /**
         * 版本
         */
        private String version = "3.0";
    }

    /**
     * 输出配置
     */
    @Data
    public static class OutputConfig {
        /**
         * Controller 输出配置
         */
        private PathConfig controller = new PathConfig("generated/api/");

        /**
         * Request 输出配置
         */
        private PathConfig request = new PathConfig("src/main/java/req/");

        /**
         * Response 输出配置
         */
        private PathConfig response = new PathConfig("src/main/java/rsp/");
    }

    /**
     * 路径配置
     */
    @Data
    public static class PathConfig {
        /**
         * 输出路径
         */
        private String path;

        public PathConfig() {
        }

        public PathConfig(String path) {
            this.path = path;
        }
    }

    /**
     * 项目配置
     */
    @Data
    public static class ProjectConfig {
        /**
         * 基础包名
         */
        private String basePackage;

        /**
         * 输出目录
         */
        private String outputDir;
    }
}
