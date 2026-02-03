package com.apicgen.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
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
        ApiDefinition apiDefinition = YAML_MAPPER.readValue(yamlFile, ApiDefinition.class);
        LOGGER.info("解析成功，共 " + apiDefinition.getApis().size() + " 个 API");
        return apiDefinition;
    }

    /**
     * 解析 YAML 字符串
     */
    public static ApiDefinition parse(String yamlContent) throws IOException {
        LOGGER.info("解析 YAML 内容");
        ApiDefinition apiDefinition = YAML_MAPPER.readValue(yamlContent, ApiDefinition.class);
        LOGGER.info("解析成功，共 " + apiDefinition.getApis().size() + " 个 API");
        return apiDefinition;
    }
}
