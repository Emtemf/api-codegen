package com.apicgen.parser;

import com.apicgen.converter.SwaggerConverter;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.apicgen.model.ApiDefinition;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.logging.Logger;

/**
 * YAML 解析器 - 支持自定义格式和 Swagger/OpenAPI
 */
public class YamlParser {

    private static final Logger LOGGER = Logger.getLogger(YamlParser.class.getName());
    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    /**
     * 解析 YAML 文件 - 自动检测格式
     */
    public static ApiDefinition parse(File yamlFile) throws IOException {
        LOGGER.info("解析 YAML 文件: " + yamlFile.getAbsolutePath());
        try {
            // 读取内容检测格式
            String content = Files.readString(yamlFile.toPath());

            // 检测是否是 Swagger/OpenAPI 格式
            if (isSwaggerFormat(content)) {
                LOGGER.info("检测到 Swagger/OpenAPI 格式，自动转换...");
                SwaggerConverter converter = new SwaggerConverter();
                return converter.parse(content);
            }

            // 使用自定义格式解析
            ApiDefinition apiDefinition = YAML_MAPPER.readValue(yamlFile, ApiDefinition.class);
            LOGGER.info("解析成功，共 " + apiDefinition.getApis().size() + " 个 API");
            return apiDefinition;
        } catch (InvalidFormatException e) {
            String message = parseInvalidFormatException(e, yamlFile.getAbsolutePath());
            throw new IOException(message, e);
        }
    }

    /**
     * 解析 YAML 字符串 - 自动检测格式
     */
    public static ApiDefinition parse(String yamlContent) throws IOException {
        LOGGER.info("解析 YAML 内容");

        // 检测是否是 Swagger/OpenAPI 格式
        if (isSwaggerFormat(yamlContent)) {
            LOGGER.info("检测到 Swagger/OpenAPI 格式，自动转换...");
            SwaggerConverter converter = new SwaggerConverter();
            return converter.parse(yamlContent);
        }

        try {
            ApiDefinition apiDefinition = YAML_MAPPER.readValue(yamlContent, ApiDefinition.class);
            LOGGER.info("解析成功，共 " + apiDefinition.getApis().size() + " 个 API");
            return apiDefinition;
        } catch (InvalidFormatException e) {
            throw new IOException(parseInvalidFormatException(e, "input"), e);
        }
    }

    /**
     * 检测是否是 Swagger/OpenAPI 格式
     */
    private static boolean isSwaggerFormat(String content) {
        if (content == null) {
            return false;
        }
        String lower = content.toLowerCase();
        return lower.contains("swagger:") ||
               lower.contains("openapi:") ||
               lower.contains("\"swagger\"") ||
               lower.contains("\"openapi\"") ||
               (lower.contains("info:") && lower.contains("paths:"));
    }

    /**
     * 解析 InvalidFormatException，生成友好的错误信息
     */
    private static String parseInvalidFormatException(InvalidFormatException e, String filePath) {
        StringBuilder sb = new StringBuilder();
        sb.append("YAML 格式错误\n\n");
        sb.append("文件: ").append(filePath).append("\n");

        // 提取行号
        String[] lines = e.getMessage().split("\n");
        for (String line : lines) {
            if (line.contains("line:")) {
                int lineIdx = line.indexOf("line:");
                String lineNum = line.substring(lineIdx + 5).trim();
                sb.append("位置: 第 ").append(lineNum.split(",")[0].trim()).append(" 行\n");
                break;
            }
        }

        sb.append("\n错误详情:\n");
        sb.append(e.getMessage().split("\n")[0]).append("\n");

        // 尝试提供更友好的提示
        String message = e.getMessage().toLowerCase();
        if (message.contains("httpmethod")) {
            sb.append("\n提示: method 必须是以下之一:\n");
            sb.append("  - POST\n  - GET\n  - PUT\n  - DELETE\n  - PATCH\n");
        }

        // 如果是不支持的字段
        if (message.contains("swagger") || message.contains("openapi")) {
            sb.append("\n提示: 检测到 Swagger/OpenAPI 格式，正在自动转换...\n");
            sb.append("如果转换失败，请检查:\n");
            sb.append("  1. paths 是否包含有效的 API 定义\n");
            sb.append("  2. 每个 API 是否有 operationId 或有效的路径\n");
        }

        return sb.toString();
    }
}
