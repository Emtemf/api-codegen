package com.apicgen.generator;

import com.apicgen.config.CodegenConfig;
import com.apicgen.model.Api;
import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * 代码生成脚本 - 将生成的代码输出到指定目录
 * 运行方式: mvn exec:java -Dexec.mainClass="com.apicgen.generator.GenerateCodeScript"
 */
public class GenerateCodeScript {

    private static final String OUTPUT_BASE = "D:/idea/workSpace/api-codegen/api-codegen-core/src/test/generated";

    public static void main(String[] args) throws IOException {
        System.out.println("========================================");
        System.out.println("API 代码生成演示");
        System.out.println("========================================\n");

        // 读取测试 YAML 文件
        File yamlFile = new File("D:/idea/workSpace/api-codegen/api-codegen-core/src/test/resources/yaml/valid-all-types.yaml");
        if (!yamlFile.exists()) {
            System.err.println("错误: YAML 文件不存在: " + yamlFile.getAbsolutePath());
            return;
        }

        // 解析 YAML
        ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
        System.out.println("解析到 " + apiDefinition.getApis().size() + " 个 API\n");

        // 创建配置
        CodegenConfig config = createConfig();

        // 获取代码生成器
        CodeGenerator generator = CodeGeneratorFactory.getGenerator(config);

        // 清空并创建输出目录
        Path basePath = Paths.get(OUTPUT_BASE).toAbsolutePath();
        clearDirectory(basePath);
        System.out.println("输出目录: " + basePath);
        System.out.println();

        // 生成并写入所有 API 的代码
        for (Api api : apiDefinition.getApis()) {
            System.out.println("生成 API: " + api.getName());

            // 生成 Controller
            Map<String, String> controllerFiles = generator.generateController(api, config);
            for (Map.Entry<String, String> entry : controllerFiles.entrySet()) {
                writeFile(basePath, "controller", api.getName(), entry.getKey(), entry.getValue());
            }

            // 生成 Request
            if (api.getRequest() != null) {
                Map<String, String> requestFiles = generator.generateRequest(api, config);
                for (Map.Entry<String, String> entry : requestFiles.entrySet()) {
                    writeFile(basePath, "request", api.getName(), entry.getKey(), entry.getValue());
                }
            }

            // 生成 Response
            if (api.getResponse() != null) {
                Map<String, String> responseFiles = generator.generateResponse(api, config);
                for (Map.Entry<String, String> entry : responseFiles.entrySet()) {
                    writeFile(basePath, "response", api.getName(), entry.getKey(), entry.getValue());
                }
            }
            System.out.println();
        }

        // 统计生成的文件
        long controllerCount = countFiles(basePath, "controller");
        long requestCount = countFiles(basePath, "request");
        long responseCount = countFiles(basePath, "response");

        System.out.println("========================================");
        System.out.println("生成的代码文件统计:");
        System.out.println("  Controller: " + controllerCount + " 个文件");
        System.out.println("  Request:    " + requestCount + " 个文件");
        System.out.println("  Response:   " + responseCount + " 个文件");
        System.out.println("  总计:       " + (controllerCount + requestCount + responseCount) + " 个文件");
        System.out.println("========================================");
        System.out.println();
        System.out.println("文件位置:");
        System.out.println("  Controller: " + basePath + "/controller/");
        System.out.println("  Request:    " + basePath + "/request/");
        System.out.println("  Response:   " + basePath + "/response/");
    }

    private static CodegenConfig createConfig() {
        CodegenConfig config = new CodegenConfig();
        config.setFramework(CodegenConfig.FrameworkType.CXF);
        config.setBasePackage("com.apicgen");
        config.setCopyright("");

        CodegenConfig.OutputConfig output = new CodegenConfig.OutputConfig();

        CodegenConfig.PathConfig controllerPath = new CodegenConfig.PathConfig();
        controllerPath.setPath(""); // 空路径，因为我们在脚本中手动处理
        output.setController(controllerPath);

        CodegenConfig.PathConfig requestPath = new CodegenConfig.PathConfig();
        requestPath.setPath("");
        output.setRequest(requestPath);

        CodegenConfig.PathConfig responsePath = new CodegenConfig.PathConfig();
        responsePath.setPath("");
        output.setResponse(responsePath);

        config.setOutput(output);

        CodegenConfig.OpenApiConfig openApi = new CodegenConfig.OpenApiConfig();
        openApi.setEnabled(false);
        config.setOpenApi(openApi);

        return config;
    }

    private static void writeFile(Path basePath, String type, String apiName, String fileName, String content) throws IOException {
        Path typePath = basePath.resolve(type).resolve(apiName);
        Files.createDirectories(typePath);
        Path filePath = typePath.resolve(fileName);
        Files.writeString(filePath, content);
        System.out.println("  └── " + type + "/" + apiName + "/" + fileName);
    }

    private static long countFiles(Path basePath, String type) {
        if (!Files.exists(basePath)) return 0;
        try {
            return Files.walk(basePath.resolve(type))
                    .filter(Files::isRegularFile)
                    .count();
        } catch (IOException e) {
            return 0;
        }
    }

    private static void clearDirectory(Path path) throws IOException {
        if (Files.exists(path)) {
            Files.walk(path)
                    .sorted((a, b) -> b.compareTo(a))
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException e) {
                            // ignore
                        }
                    });
        }
        Files.createDirectories(path);
    }
}
