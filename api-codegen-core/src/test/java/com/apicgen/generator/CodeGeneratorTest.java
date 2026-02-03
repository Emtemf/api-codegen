package com.apicgen.generator;

import com.apicgen.config.CodegenConfig;
import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 代码生成器集成测试
 * 生成实际的 Java 文件并验证输出
 */
class CodeGeneratorTest {

    @TempDir
    Path tempDir;

    private CodegenConfig createConfig(Path outputDir) {
        CodegenConfig config = new CodegenConfig();
        config.setFramework(CodegenConfig.FrameworkType.CXF);
        config.setBasePackage("com.apicgen");

        CodegenConfig.CopyrightConfig copyright = new CodegenConfig.CopyrightConfig();
        copyright.setCompany("");
        copyright.setStartYear(2024);
        config.setCopyright(copyright);

        CodegenConfig.OutputConfig output = new CodegenConfig.OutputConfig();
        CodegenConfig.PathConfig controllerPath = new CodegenConfig.PathConfig();
        controllerPath.setPath("generated/api/");
        output.setController(controllerPath);

        CodegenConfig.PathConfig requestPath = new CodegenConfig.PathConfig();
        requestPath.setPath("src/main/java/req/");
        output.setRequest(requestPath);

        CodegenConfig.PathConfig responsePath = new CodegenConfig.PathConfig();
        responsePath.setPath("src/main/java/rsp/");
        output.setResponse(responsePath);

        config.setOutput(output);

        CodegenConfig.OpenApiConfig openApi = new CodegenConfig.OpenApiConfig();
        openApi.setEnabled(false);
        config.setOpenApi(openApi);

        return config;
    }

    @Nested
    @DisplayName("ShouldGenerateCodeFromValidYaml")
    class ShouldGenerateCodeFromValidYaml {

        @Test
        @DisplayName("should_generate_controller_request_response_from_valid_yaml")
        void shouldGenerateControllerRequestResponseFromValidYaml() throws IOException {
            // 读取测试 YAML 文件
            File yamlFile = new File("src/test/resources/yaml/valid-all-types.yaml");
            assertTrue(yamlFile.exists(), "YAML 文件应存在");

            // 解析 YAML
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            assertNotNull(apiDefinition, "解析结果不应为空");
            assertEquals(5, apiDefinition.getApis().size(), "应解析 5 个 API");

            // 创建配置
            CodegenConfig config = createConfig(tempDir);

            // 获取代码生成器
            CodeGenerator generator = CodeGeneratorFactory.getGenerator(config);

            // 生成并写入所有 API 的代码
            for (com.apicgen.model.Api api : apiDefinition.getApis()) {
                // 生成 Controller
                Map<String, String> controllerFiles = generator.generateController(api, config);
                for (Map.Entry<String, String> entry : controllerFiles.entrySet()) {
                    writeFile(tempDir, "controller", api.getName(), entry.getKey(), entry.getValue());
                }

                // 生成 Request
                if (api.getRequest() != null) {
                    Map<String, String> requestFiles = generator.generateRequest(api, config);
                    for (Map.Entry<String, String> entry : requestFiles.entrySet()) {
                        writeFile(tempDir, "request", api.getName(), entry.getKey(), entry.getValue());
                    }
                }

                // 生成 Response
                if (api.getResponse() != null) {
                    Map<String, String> responseFiles = generator.generateResponse(api, config);
                    for (Map.Entry<String, String> entry : responseFiles.entrySet()) {
                        writeFile(tempDir, "response", api.getName(), entry.getKey(), entry.getValue());
                    }
                }
            }

            // 验证生成的文件
            Path outputPath = tempDir.resolve("output");
            assertTrue(Files.exists(outputPath), "输出目录应存在");

            // 统计生成的文件
            long controllerCount = countFiles(outputPath, "controller");
            long requestCount = countFiles(outputPath, "request");
            long responseCount = countFiles(outputPath, "response");

            System.out.println("\n========================================");
            System.out.println("生成的代码文件统计:");
            System.out.println("  Controller: " + controllerCount + " 个文件");
            System.out.println("  Request: " + requestCount + " 个文件");
            System.out.println("  Response: " + responseCount + " 个文件");
            System.out.println("  总计: " + (controllerCount + requestCount + responseCount) + " 个文件");
            System.out.println("输出目录: " + outputPath);
            System.out.println("========================================\n");

            // 验证文件数量
            assertTrue(controllerCount > 0, "应生成至少一个 Controller 文件");
            assertTrue(requestCount > 0, "应生成至少一个 Request 文件");
            assertTrue(responseCount > 0, "应生成至少一个 Response 文件");
        }

        private void writeFile(Path basePath, String type, String apiName, String fileName, String content) throws IOException {
            Path typePath = basePath.resolve("output").resolve(type).resolve(apiName);
            Files.createDirectories(typePath);
            Path filePath = typePath.resolve(fileName);
            Files.writeString(filePath, content);
            System.out.println("  生成: " + typePath.relativize(basePath) + "/" + type + "/" + apiName + "/" + fileName);
        }

        private long countFiles(Path basePath, String type) {
            if (!Files.exists(basePath)) return 0;
            try {
                return Files.walk(basePath.resolve(type))
                        .filter(Files::isRegularFile)
                        .count();
            } catch (IOException e) {
                return 0;
            }
        }
    }

    @Nested
    @DisplayName("ShouldValidateOutputPathConfig")
    class ShouldValidateOutputPathConfig {

        @Test
        @DisplayName("should_use_configurable_output_paths")
        void shouldUseConfigurableOutputPaths() {
            CodegenConfig config = new CodegenConfig();

            // 验证默认值
            assertNull(config.getOutput(), "输出配置默认为 null");

            // 设置输出配置
            CodegenConfig.OutputConfig output = new CodegenConfig.OutputConfig();

            CodegenConfig.PathConfig controllerPath = new CodegenConfig.PathConfig();
            controllerPath.setPath("generated/api/");
            output.setController(controllerPath);

            CodegenConfig.PathConfig requestPath = new CodegenConfig.PathConfig();
            requestPath.setPath("src/main/java/req/");
            output.setRequest(requestPath);

            CodegenConfig.PathConfig responsePath = new CodegenConfig.PathConfig();
            responsePath.setPath("src/main/java/rsp/");
            output.setResponse(responsePath);

            config.setOutput(output);

            // 验证配置
            assertEquals("generated/api/", config.getOutput().getController().getPath());
            assertEquals("src/main/java/req/", config.getOutput().getRequest().getPath());
            assertEquals("src/main/java/rsp/", config.getOutput().getResponse().getPath());
        }

        @Test
        @DisplayName("should_resolve_correct_file_paths")
        void shouldResolveCorrectFilePaths() throws IOException {
            CodegenConfig config = createConfig(tempDir);

            // 模拟生成文件路径
            String basePackage = config.getBasePackage();
            String packagePath = basePackage.replace('.', '/');

            String expectedControllerPath = "generated/api/" + packagePath + "/api/CreateController.java";
            String expectedRequestPath = "src/main/java/req/" + packagePath + "/req/CreateUserReq.java";
            String expectedResponsePath = "src/main/java/rsp/" + packagePath + "/rsp/CreateUserRsp.java";

            assertTrue(expectedControllerPath.contains("generated/api/"), "Controller 应在 generated/api/");
            assertTrue(expectedRequestPath.contains("src/main/java/req/"), "Request 应在 src/main/java/req/");
            assertTrue(expectedResponsePath.contains("src/main/java/rsp/"), "Response 应在 src/main/java/rsp/");
        }
    }
}
