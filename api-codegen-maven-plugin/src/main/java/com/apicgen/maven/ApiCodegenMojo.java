package com.apicgen.maven;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.apicgen.config.CodegenConfig;
import com.apicgen.generator.CodeGenerator;
import com.apicgen.generator.CodeGeneratorFactory;
import com.apicgen.model.Api;
import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import com.apicgen.util.CodeGenUtil;
import com.apicgen.validator.ApiValidator;
import com.apicgen.validator.ValidationResult;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.LifecyclePhase;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Year;
import java.util.Map;
import java.util.logging.Logger;

/**
 * API 代码生成 Maven 插件
 */
@Mojo(name = "generate", defaultPhase = LifecyclePhase.GENERATE_SOURCES)
public class ApiCodegenMojo extends AbstractMojo {

    private static final Logger LOG = Logger.getLogger(ApiCodegenMojo.class.getName());

    /**
     * YAML 文件路径
     */
    @Parameter(property = "yamlFile", defaultValue = "${basedir}/src/main/resources/api.yaml", required = true)
    private String yamlFile;

    /**
     * 输出目录
     */
    @Parameter(property = "outputDir", defaultValue = "${basedir}/src/main/java", required = true)
    private String outputDir;

    /**
     * 基础包名
     */
    @Parameter(property = "basePackage", defaultValue = "com.apicgen", required = true)
    private String basePackage;

    /**
     * 框架类型: cxf, spring
     */
    @Parameter(property = "framework", defaultValue = "cxf")
    private String framework;

    /**
     * 公司名称（用于版权声明，为空时省略）
     */
    @Parameter(property = "company", defaultValue = "")
    private String company;

    /**
     * 开始年份
     */
    @Parameter(property = "startYear", defaultValue = "")
    private String startYear;

    /**
     * 是否启用 OpenAPI 注解
     */
    @Parameter(property = "openapi", defaultValue = "false")
    private boolean openapi;

    /**
     * 是否强制覆盖已有文件
     */
    @Parameter(property = "force", defaultValue = "false")
    private boolean force;

    /**
     * 配置文件路径
     */
    @Parameter(property = "configFile", defaultValue = "${basedir}/codegen-config.yaml")
    private String configFile;

    @Override
    public void execute() throws MojoExecutionException {
        LOG.info("========================================");
        LOG.info("API 代码生成器 v1.0.0");
        LOG.info("========================================");

        try {
            // 1. 加载配置
            CodegenConfig config = loadConfig();
            LOG.info("框架类型: " + config.getFramework());
            LOG.info("OpenAPI 注解: " + config.getOpenApi().isEnabled());

            // 2. 解析 YAML
            File yamlFileObj = new File(yamlFile);
            if (!yamlFileObj.exists()) {
                throw new MojoExecutionException("YAML 文件不存在: " + yamlFile);
            }
            ApiDefinition apiDefinition = YamlParser.parse(yamlFileObj);
            LOG.info("解析到 " + apiDefinition.getApis().size() + " 个 API");

            // 3. 校验 API 定义
            ApiValidator validator = new ApiValidator();
            ValidationResult validationResult = validator.validate(apiDefinition);
            if (!validationResult.isValid()) {
                LOG.severe("YAML 校验失败:\n" + validationResult.getErrorMessage());
                throw new MojoExecutionException("YAML 校验失败");
            }
            LOG.info("YAML 校验通过");

            // 4. 生成代码
            generateCode(apiDefinition, config);

            LOG.info("========================================");
            LOG.info("代码生成完成！");
            LOG.info("========================================");

        } catch (MojoExecutionException e) {
            throw e;
        } catch (Exception e) {
            LOG.log(java.util.logging.Level.SEVERE, "代码生成失败", e);
            throw new MojoExecutionException("代码生成失败: " + e.getMessage(), e);
        }
    }

    private CodegenConfig loadConfig() throws IOException {
        File configFileObj = new File(configFile);
        CodegenConfig config = new CodegenConfig();

        if (configFileObj.exists()) {
            // 从配置文件加载
            ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
            config = yamlMapper.readValue(configFileObj, CodegenConfig.class);
            LOG.info("加载配置文件: " + configFile);
        }

        // 命令行参数覆盖配置文件
        if (framework != null && !framework.isBlank()) {
            config.setFramework(CodegenConfig.FrameworkType.valueOf(framework.toUpperCase()));
        }

        // 设置basePackage（默认使用命令行参数）
        if (basePackage != null && !basePackage.isBlank()) {
            config.setBasePackage(basePackage);
        }

        if (company != null && !company.isBlank()) {
            if (config.getCopyright() == null) {
                config.setCopyright(new CodegenConfig.CopyrightConfig());
            }
            config.getCopyright().setCompany(company);
        }
        if (startYear != null && !startYear.isBlank()) {
            if (config.getCopyright() == null) {
                config.setCopyright(new CodegenConfig.CopyrightConfig());
            }
            try {
                config.getCopyright().setStartYear(Integer.parseInt(startYear));
            } catch (NumberFormatException e) {
                LOG.warning("startYear 解析失败: " + startYear + ", 使用当前年份");
                config.getCopyright().setStartYear(Year.now().getValue());
            }
        }
        if (config.getOpenApi() == null) {
            config.setOpenApi(new CodegenConfig.OpenApiConfig());
        }
        config.getOpenApi().setEnabled(openapi);

        // 默认版权配置（公司名为空）
        if (config.getCopyright() == null) {
            config.setCopyright(new CodegenConfig.CopyrightConfig());
            config.getCopyright().setCompany("");
            config.getCopyright().setStartYear(Year.now().getValue());
        }

        // 默认输出配置
        if (config.getOutput() == null) {
            config.setOutput(new CodegenConfig.OutputConfig());
        }

        LOG.info("基础包名: " + config.getBasePackage());
        LOG.info("Controller 输出: " + config.getOutput().getController().getPath());
        LOG.info("Request 输出: " + config.getOutput().getRequest().getPath());
        LOG.info("Response 输出: " + config.getOutput().getResponse().getPath());

        return config;
    }

    private void generateCode(ApiDefinition apiDefinition, CodegenConfig config) throws IOException {
        CodeGenerator generator = CodeGeneratorFactory.getGenerator(config);

        // 确保输出目录存在
        Path basePath = Paths.get(outputDir);
        createDirectories(basePath);

        for (Api api : apiDefinition.getApis()) {
            LOG.info("生成 API: " + api.getName());

            // 生成 Controller（可能包含多个文件）
            Map<String, String> controllerFiles = generator.generateController(api, config);
            for (Map.Entry<String, String> entry : controllerFiles.entrySet()) {
                String fileName = entry.getKey();
                String content = entry.getValue();
                Path filePath = getControllerFilePath(api, config, fileName);
                writeCode(filePath, content, fileName.replace(".java", ""));
            }

            // 生成 Request（可能包含主类和嵌套类）
            if (api.getRequest() != null) {
                Map<String, String> requestFiles = generator.generateRequest(api, config);
                for (Map.Entry<String, String> entry : requestFiles.entrySet()) {
                    String fileName = entry.getKey();
                    String content = entry.getValue();
                    Path filePath = getRequestFilePath(api, config, fileName);
                    writeCode(filePath, content, fileName.replace(".java", ""));
                }
            }

            // 生成 Response（可能包含主类和嵌套类）
            if (api.getResponse() != null) {
                Map<String, String> responseFiles = generator.generateResponse(api, config);
                for (Map.Entry<String, String> entry : responseFiles.entrySet()) {
                    String fileName = entry.getKey();
                    String content = entry.getValue();
                    Path filePath = getResponseFilePath(api, config, fileName);
                    writeCode(filePath, content, fileName.replace(".java", ""));
                }
            }
        }
    }

    private Path getControllerFilePath(Api api, CodegenConfig config, String fileName) {
        String packagePath = getBasePackagePath(config) + "/api";
        return Paths.get(outputDir, config.getOutput().getController().getPath(), packagePath, fileName);
    }

    private Path getRequestFilePath(Api api, CodegenConfig config, String fileName) {
        String packagePath = getRequestPackagePath(config);
        return Paths.get(outputDir, config.getOutput().getRequest().getPath(), packagePath, fileName);
    }

    private Path getResponseFilePath(Api api, CodegenConfig config, String fileName) {
        String packagePath = getResponsePackagePath(config);
        return Paths.get(outputDir, config.getOutput().getResponse().getPath(), packagePath, fileName);
    }

    private Path getControllerPath(Api api, CodegenConfig config) {
        String packagePath = getBasePackagePath(config) + "/api";
        String className = CodeGenUtil.capitalize(api.getName()) + "Controller.java";
        return Paths.get(outputDir, config.getOutput().getController().getPath(), packagePath, className);
    }

    private Path getRequestPath(Api api, CodegenConfig config) {
        String packagePath = getRequestPackagePath(config);
        String className = api.getRequest().getClassName() + ".java";
        return Paths.get(outputDir, config.getOutput().getRequest().getPath(), packagePath, className);
    }

    private Path getResponsePath(Api api, CodegenConfig config) {
        String packagePath = getResponsePackagePath(config);
        String className = api.getResponse().getClassName() + ".java";
        return Paths.get(outputDir, config.getOutput().getResponse().getPath(), packagePath, className);
    }

    private String getBasePackagePath(CodegenConfig config) {
        String basePkg = config.getBasePackage();
        return basePkg != null ? basePkg.replace('.', '/') : "com/apicgen";
    }

    private String getRequestPackagePath(CodegenConfig config) {
        return getRequestPackageName(config).replace('.', '/');
    }

    private String getResponsePackagePath(CodegenConfig config) {
        return getResponsePackageName(config).replace('.', '/');
    }

    private String getRequestPackageName(CodegenConfig config) {
        String basePkg = config.getBasePackage();
        return (basePkg != null ? basePkg : "com.apicgen") + ".req";
    }

    private String getResponsePackageName(CodegenConfig config) {
        String basePkg = config.getBasePackage();
        return (basePkg != null ? basePkg : "com.apicgen") + ".rsp";
    }

    private void writeCode(Path filePath, String code, String className) throws IOException {
        // 确保父目录存在
        Files.createDirectories(filePath.getParent());

        // 检查文件是否存在
        if (Files.exists(filePath) && !force) {
            LOG.warning("文件已存在，跳过: " + filePath);
            LOG.warning("使用 --force 强制覆盖");
            return;
        }

        // 备份已有文件
        if (Files.exists(filePath) && force) {
            Path backupPath = Paths.get(filePath.toString() + ".bak");
            Files.copy(filePath, backupPath);
            LOG.info("备份文件: " + backupPath);
        }

        // 写入文件
        try (FileWriter writer = new FileWriter(filePath.toFile())) {
            writer.write(code);
        }
        LOG.info("生成文件: " + filePath);
    }

    private void createDirectories(Path path) throws IOException {
        Files.createDirectories(path);
    }
}
