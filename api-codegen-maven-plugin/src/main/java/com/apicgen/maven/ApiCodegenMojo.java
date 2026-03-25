package com.apicgen.maven;

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
 * Maven 插件入口：读取 YAML 与插件参数，完成校验分析、定义校验及代码落盘。
 * <p>
 * 行为边界：
 * <ul>
 *   <li>仅负责编排流程，不承载具体代码生成算法。</li>
 *   <li>文件写入遵循 {@code force} 覆盖策略：默认跳过已存在文件，开启后先备份再覆盖。</li>
 * </ul>
 */
@Mojo(name = "generate", defaultPhase = LifecyclePhase.GENERATE_SOURCES)
public class ApiCodegenMojo extends AbstractMojo {

    /**
     * JDK 日志器，用于在 Maven 上下文不可用时仍可输出日志。
     */
    private static final Logger LOG = Logger.getLogger(ApiCodegenMojo.class.getName());

    /**
     * 待解析的 API 定义 YAML 文件绝对/相对路径。
     */
    @Parameter(property = "yamlFile", defaultValue = "${basedir}/src/main/resources/api.yaml", required = true)
    private String yamlFile;

    /**
     * 代码输出根目录，后续会拼接 controller/request/response 子路径。
     */
    @Parameter(property = "outputDir", defaultValue = "${basedir}/src/main/java", required = true)
    private String outputDir;

    /**
     * 生成代码使用的基础包名；可覆盖配置文件中的同名配置。
     */
    @Parameter(property = "basePackage", defaultValue = "com.apicgen", required = true)
    private String basePackage;

    /**
     * 目标框架类型（cxf/spring），解析时会转为大写枚举值。
     */
    @Parameter(property = "framework", defaultValue = "cxf")
    private String framework;

    /**
     * 版权声明中的公司名称；为空时不拼接公司名。
     */
    @Parameter(property = "company", defaultValue = "")
    private String company;

    /**
     * 版权声明起始年份；为空时且 company 非空则使用当前年份。
     */
    @Parameter(property = "startYear", defaultValue = "")
    private String startYear;

    /**
     * 是否启用 OpenAPI 注解输出开关。
     */
    @Parameter(property = "openapi", defaultValue = "false")
    private boolean openapi;

    /**
     * 覆盖策略开关：
     * false 表示目标文件已存在时跳过；true 表示先备份 .bak 后覆盖写入。
     */
    @Parameter(property = "force", defaultValue = "false")
    private boolean force;

    /**
     * 仅执行校验规则分析，不生成代码。
     */
    @Parameter(property = "analyze", defaultValue = "false")
    private boolean analyze;

    /**
     * 执行校验规则自动修复并回写 YAML，修复后直接结束流程。
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
     * 执行校验规则分析，并按开关决定是否回写修复结果。
     *
     * @param apiDefinition 已解析的 API 定义对象，不负责空值兜底
     * @param autoFix true 表示执行自动修复并尝试写回原 YAML；false 仅输出分析结果
     * @param yamlFile 原始 YAML 文件，用于 autoFix 回写与失败兜底文件输出
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

    /**
     * 加载并合并代码生成配置。
     * <p>
     * 当前仅使用 Maven 参数与内置默认值，不再隐式读取项目根目录的历史配置文件。
     * 若输出配置缺失，仅补齐默认对象，不在此处创建业务文件。
     *
     * @return 合并后的配置对象，供后续生成流程使用
     * @throws IOException 配置文件存在但读取失败时抛出
     */
    private CodegenConfig loadConfig() throws IOException {
        CodegenConfig config = new CodegenConfig();

        // 仅使用命令行参数覆盖默认配置
        if (framework != null && !framework.isBlank()) {
            config.setFramework(CodegenConfig.FrameworkType.valueOf(framework.toUpperCase()));
        }

        // 设置basePackage（默认使用命令行参数）
        if (basePackage != null && !basePackage.isBlank()) {
            config.setBasePackage(basePackage);
        }

        // 构建版权声明字符串
        String copyright = "";
        if (company != null && !company.isBlank()) {
            String year = startYear != null && !startYear.isBlank() ? startYear : String.valueOf(Year.now().getValue());
            copyright = "Copyright (c) " + year + " " + company + ". All rights reserved.";
        } else if (startYear != null && !startYear.isBlank()) {
            copyright = "Copyright (c) " + startYear + ". All rights reserved.";
        }
        if (!copyright.isBlank()) {
            config.setCopyright(copyright);
        }

        if (config.getOpenApi() == null) {
            config.setOpenApi(new CodegenConfig.OpenApiConfig());
        }
        config.getOpenApi().setEnabled(openapi);

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

    /**
     * 按配置生成并写入 Controller/Request/Response 代码。
     * <p>
     * 行为边界：
     * <ul>
     *   <li>CXF 生成器走统一 Controller 生成路径。</li>
     *   <li>其他生成器回退为逐 API 生成 Controller。</li>
     *   <li>实际覆盖行为由 {@link #writeCode(Path, String, String)} 与 {@code force} 控制。</li>
     * </ul>
     *
     * @param apiDefinition 已通过解析/校验的 API 定义
     * @param config 合并后的生成配置
     * @throws IOException 创建目录或写文件失败时抛出
     */
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

    /**
     * 将单个 Java 文件写入磁盘，并执行覆盖策略。
     * <p>
     * 覆盖规则：
     * <ul>
     *   <li>当目标已存在且 {@code force=false} 时跳过写入并打印提示。</li>
     *   <li>当目标已存在且 {@code force=true} 时先备份为 {@code .bak}，再覆盖写入。</li>
     * </ul>
     *
     * @param filePath 目标文件完整路径
     * @param code 待写入源码文本
     * @param className 类名（当前仅用于接口兼容，方法内不参与逻辑分支）
     * @throws IOException 创建目录、备份或写入失败时抛出
     */
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

    /**
     * 输出 INFO 日志，同时写入 JDK Logger 与 Maven Log（若可用）。
     *
     * @param message 日志正文
     */
    private void logInfo(String message) {
        LOG.info(message);
        Log log = getLog();
        if (log != null) {
            log.info(message);
        }
    }

    /**
     * 输出 WARNING 日志，同时写入 JDK Logger 与 Maven Log（若可用）。
     *
     * @param message 日志正文
     */
    private void logWarning(String message) {
        LOG.warning(message);
        Log log = getLog();
        if (log != null) {
            log.warn(message);
        }
    }

    /**
     * 输出 ERROR/SEVERE 日志，同时写入 JDK Logger 与 Maven Log（若可用）。
     *
     * @param message 日志正文
     */
    private void logSevere(String message) {
        LOG.log(Level.SEVERE, message);
        Log log = getLog();
        if (log != null) {
            log.error(message);
        }
    }
}
