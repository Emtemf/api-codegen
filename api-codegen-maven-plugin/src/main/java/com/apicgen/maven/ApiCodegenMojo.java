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
import com.apicgen.validator.ValidationAnalyzer;
import com.apicgen.validator.ValidationAnalyzer.AnalysisItem;
import com.apicgen.validator.ValidationAnalyzer.AnalysisSummary;
import com.apicgen.validator.ValidationFixer;
import com.apicgen.validator.ValidationResult;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.logging.Log;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
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

    /**
     * 是否分析缺失的校验规则
     */
    @Parameter(property = "analyze", defaultValue = "false")
    private boolean analyze;

    /**
     * 是否自动修复缺失的校验规则
     */
    @Parameter(property = "autoFix", defaultValue = "false")
    private boolean autoFix;

    @Override
    public void execute() throws MojoExecutionException {
        logInfo("========================================");
        logInfo("API 代码生成器 v1.0.0");
        logInfo("========================================");

        try {
            // 1. 加载配置
            CodegenConfig config = loadConfig();
            logInfo("框架类型: " + config.getFramework());
            logInfo("OpenAPI 注解: " + config.getOpenApi().isEnabled());

            // 2. 解析 YAML
            File yamlFileObj = new File(yamlFile);
            if (!yamlFileObj.exists()) {
                throw new MojoExecutionException("YAML 文件不存在: " + yamlFile);
            }
            ApiDefinition apiDefinition = YamlParser.parse(yamlFileObj);
            logInfo("解析到 " + apiDefinition.getApis().size() + " 个 API");

            // 3. 分析校验规则
            if (analyze || autoFix) {
                runValidationAnalysis(apiDefinition, autoFix, yamlFileObj);
                if (autoFix) {
                    logInfo("自动修复完成，退出");
                    return;
                }
                if (analyze) {
                    return;
                }
            }

            // 4. 校验 API 定义
            ApiValidator validator = new ApiValidator();
            ValidationResult validationResult = validator.validate(apiDefinition);
            if (!validationResult.isValid()) {
                logSevere("YAML 校验失败:\n" + validationResult.getErrorMessage());
                throw new MojoExecutionException("YAML 校验失败");
            }
            logInfo("YAML 校验通过");

            // 5. 生成代码
            generateCode(apiDefinition, config);

            logInfo("========================================");
            logInfo("代码生成完成！");
            logInfo("========================================");

        } catch (MojoExecutionException e) {
            throw e;
        } catch (Exception e) {
            logSevere("代码生成失败: " + e.getMessage());
            throw new MojoExecutionException("代码生成失败: " + e.getMessage(), e);
        }
    }

    /**
     * 运行校验规则分析
     */
    private void runValidationAnalysis(ApiDefinition apiDefinition, boolean autoFix, File yamlFile) {
        logInfo("========================================");
        logInfo("校验规则分析");
        logInfo("========================================");

        ValidationAnalyzer analyzer = new ValidationAnalyzer();
        AnalysisSummary summary = analyzer.summarize(apiDefinition);

        if (!summary.hasIssues()) {
            logInfo("未发现校验问题，做得很好！");
            return;
        }

        // 打印摘要
        logInfo("摘要:");
        logInfo("  错误:   " + summary.getErrorCount());
        logInfo("  警告:   " + summary.getWarningCount());
        logInfo("  信息:   " + summary.getInfoCount());
        logInfo("  总计:   " + summary.getTotalCount());
        logInfo("");

        // 获取详细分析结果
        List<AnalysisItem> issues = analyzer.analyze(apiDefinition);

        // 按严重程度打印问题
        logInfo("问题列表:");
        printIssuesBySeverity(issues, AnalysisItem.Severity.ERROR);
        printIssuesBySeverity(issues, AnalysisItem.Severity.WARNING);
        printIssuesBySeverity(issues, AnalysisItem.Severity.INFO);

        // 自动修复
        if (autoFix) {
            logInfo("");
            logInfo("========================================");
            logInfo("自动修复模式");
            logInfo("========================================");

            ValidationFixer fixer = new ValidationFixer();
            String fixedYaml = fixer.fix(apiDefinition, issues);

            try {
                Files.writeString(yamlFile.toPath(), fixedYaml);
                logInfo("自动修复完成！已更新文件: " + yamlFile.getAbsolutePath());
                logInfo("已修复 " + summary.getTotalCount() + " 个问题");
            } catch (IOException e) {
                logSevere("写入修复文件失败: " + e.getMessage());
                // 尝试写入到固定文件
                String backupPath = yamlFile.getAbsolutePath().replace(".yaml", "-fixed.yaml");
                try {
                    Files.writeString(Paths.get(backupPath), fixedYaml);
                    logInfo("已将修复版本写入: " + backupPath);
                } catch (IOException ex) {
                    logSevere("写入备份文件失败: " + ex.getMessage());
                }
            }
        } else {
            logInfo("");
            logInfo("========================================");
            logInfo("自动修复命令:");
            logInfo("  mvn api-codegen:generate -DautoFix=true");
            logInfo("========================================");
        }
    }

    /**
     * 按严重程度打印问题
     */
    private void printIssuesBySeverity(List<AnalysisItem> issues, AnalysisItem.Severity severity) {
        for (AnalysisItem issue : issues) {
            if (issue.getSeverity() == severity) {
                logInfo("  " + issue.toString());
            }
        }
    }

    private CodegenConfig loadConfig() throws IOException {
        File configFileObj = new File(configFile);
        CodegenConfig config = new CodegenConfig();

        if (configFileObj.exists()) {
            // 从配置文件加载
            ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());
            config = yamlMapper.readValue(configFileObj, CodegenConfig.class);
            logInfo("加载配置文件: " + configFile);
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
                logWarning("startYear 解析失败: " + startYear + ", 使用当前年份");
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

        logInfo("基础包名: " + config.getBasePackage());
        logInfo("Controller 输出: " + config.getOutput().getController().getPath());
        logInfo("Request 输出: " + config.getOutput().getRequest().getPath());
        logInfo("Response 输出: " + config.getOutput().getResponse().getPath());

        return config;
    }

    private void generateCode(ApiDefinition apiDefinition, CodegenConfig config) throws IOException {
        CodeGenerator generator = CodeGeneratorFactory.getGenerator(config);

        // 确保输出目录存在
        Path basePath = Paths.get(outputDir);
        createDirectories(basePath);

        // 生成统一的 Controller（包含所有 API 方法）
        logInfo("生成统一的 API 控制器...");
        Map<String, String> controllerFiles;
        if (generator instanceof com.apicgen.generator.cxf.CxfCodeGenerator) {
            // CXF 生成器：生成统一 Controller
            controllerFiles = ((com.apicgen.generator.cxf.CxfCodeGenerator) generator)
                    .generateControllers(apiDefinition, config);
        } else {
            // 其他生成器：回退到原来的方式（每个 API 一个 Controller）
            controllerFiles = new LinkedHashMap<>();
            for (Api api : apiDefinition.getApis()) {
                controllerFiles.putAll(generator.generateController(api, config));
            }
        }

        // 写入 Controller 文件
        for (Map.Entry<String, String> entry : controllerFiles.entrySet()) {
            String fileName = entry.getKey();
            String content = entry.getValue();
            Path filePath = getUnifiedControllerFilePath(config, fileName);
            writeCode(filePath, content, fileName.replace(".java", ""));
        }

        // 生成 Request 和 Response（每个 API 独立）
        for (Api api : apiDefinition.getApis()) {
            logInfo("生成 API: " + api.getName());

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

    private Path getUnifiedControllerFilePath(CodegenConfig config, String fileName) {
        String packagePath = getBasePackagePath(config) + "/api";
        String basePath = outputDir + "/" + config.getOutput().getController().getPath() + "/" + packagePath;
        return Paths.get(normalizePath(basePath), fileName);
    }

    private Path getControllerFilePath(Api api, CodegenConfig config, String fileName) {
        String packagePath = getBasePackagePath(config) + "/api";
        String basePath = outputDir + "/" + config.getOutput().getController().getPath() + "/" + packagePath;
        return Paths.get(normalizePath(basePath), fileName);
    }

    private Path getRequestFilePath(Api api, CodegenConfig config, String fileName) {
        String packagePath = getRequestPackagePath(config);
        String basePath = outputDir + "/" + config.getOutput().getRequest().getPath() + "/" + packagePath;
        return Paths.get(normalizePath(basePath), fileName);
    }

    private Path getResponseFilePath(Api api, CodegenConfig config, String fileName) {
        String packagePath = getResponsePackagePath(config);
        String basePath = outputDir + "/" + config.getOutput().getResponse().getPath() + "/" + packagePath;
        return Paths.get(normalizePath(basePath), fileName);
    }

    /**
     * 规范化路径，去除重复的斜杠
     */
    private String normalizePath(String path) {
        return path.replaceAll("/+", "/");
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
            logWarning("文件已存在，跳过: " + filePath);
            logWarning("使用 -Dforce=true 强制覆盖");
            return;
        }

        // 备份已有文件
        if (Files.exists(filePath) && force) {
            Path backupPath = Paths.get(filePath.toString() + ".bak");
            Files.copy(filePath, backupPath);
            logInfo("备份文件: " + backupPath);
        }

        // 写入文件
        try (FileWriter writer = new FileWriter(filePath.toFile())) {
            writer.write(code);
        }
        logInfo("生成文件: " + filePath);
    }

    private void createDirectories(Path path) throws IOException {
        Files.createDirectories(path);
    }

    // 适配 Maven 日志
    private void logInfo(String message) {
        LOG.info(message);
        Log log = getLog();
        if (log != null) {
            log.info(message);
        }
    }

    private void logWarning(String message) {
        LOG.warning(message);
        Log log = getLog();
        if (log != null) {
            log.warn(message);
        }
    }

    private void logSevere(String message) {
        LOG.log(Level.SEVERE, message);
        Log log = getLog();
        if (log != null) {
            log.error(message);
        }
    }
}
