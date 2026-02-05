package com.apicgen.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.apicgen.model.ApiDefinition;

import java.io.File;
import java.io.IOException;
import java.util.logging.Logger;

/**
 * YAML 解析器
 */
public class YamlParser {

    private static final Logger LOGGER = Logger.getLogger(YamlParser.class.getName());
    private static final ObjectMapper YAML_MAPPER = new ObjectMapper(new YAMLFactory());

    /**
     * 解析 YAML 文件
     */
    public static ApiDefinition parse(File yamlFile) throws IOException {
        LOGGER.info("解析 YAML 文件: " + yamlFile.getAbsolutePath());
        try {
            ApiDefinition apiDefinition = YAML_MAPPER.readValue(yamlFile, ApiDefinition.class);
            LOGGER.info("解析成功，共 " + apiDefinition.getApis().size() + " 个 API");
            return apiDefinition;
        } catch (InvalidFormatException e) {
            String message = parseInvalidFormatException(e, yamlFile.getAbsolutePath());
            throw new IOException(message, e);
        }
    }

    /**
     * 解析 YAML 字符串
     */
    public static ApiDefinition parse(String yamlContent) throws IOException {
        LOGGER.info("解析 YAML 内容");
        try {
            ApiDefinition apiDefinition = YAML_MAPPER.readValue(yamlContent, ApiDefinition.class);
            LOGGER.info("解析成功，共 " + apiDefinition.getApis().size() + " 个 API");
            return apiDefinition;
        } catch (InvalidFormatException e) {
            throw new IOException(parseInvalidFormatException(e, "input"), e);
        }
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

        return sb.toString();
    }
}
