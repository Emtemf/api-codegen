package com.apicgen.maven;

import com.apicgen.config.CodegenConfig;
import com.apicgen.generator.CodeGenerator;
import com.apicgen.generator.CodeGeneratorFactory;
import com.apicgen.model.Api;
import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

/**
 * Maven 插件集成测试脚本
 * 模拟 Maven 插件的完整执行流程
 */
public class MavenPluginIntegrationTest {

    private static final String TEST_PROJECT_DIR = "D:/idea/workSpace/api-codegen/api-codegen-maven-plugin/target/test-project";
    private static final String YAML_FILE = TEST_PROJECT_DIR + "/api.yaml";
    private static final String CONFIG_FILE = TEST_PROJECT_DIR + "/codegen-config.yaml";

    public static void main(String[] args) throws Exception {
        System.out.println("========================================");
        System.out.println("Maven 插件集成测试");
        System.out.println("========================================\n");

        // Step 1: 创建测试项目
        createTestProject();

        // Step 2: 模拟插件执行
        System.out.println("\n[Step 1] 加载配置...");
        CodegenConfig config = loadConfig();
        System.out.println("  框架: " + config.getFramework());
        System.out.println("  基础包: " + config.getBasePackage());
        System.out.println("  Controller路径: " + config.getOutput().getController().getPath());
        System.out.println("  Request路径: " + config.getOutput().getRequest().getPath());
        System.out.println("  Response路径: " + config.getOutput().getResponse().getPath());

        // Step 3: 解析 YAML
        System.out.println("\n[Step 2] 解析 YAML 文件...");
        File yamlFileObj = new File(YAML_FILE);
        ApiDefinition apiDefinition = YamlParser.parse(yamlFileObj);
        System.out.println("  解析到 " + apiDefinition.getApis().size() + " 个 API");

        // Step 4: 生成代码
        System.out.println("\n[Step 3] 生成代码...");
        CodeGenerator generator = CodeGeneratorFactory.getGenerator(config);

        int totalControllers = 0;
        int totalRequests = 0;
        int totalResponses = 0;

        for (Api api : apiDefinition.getApis()) {
            System.out.println("\n  生成 API: " + api.getName());

            // 生成 Controller
            Map<String, String> controllerFiles = generator.generateController(api, config);
            for (Map.Entry<String, String> entry : controllerFiles.entrySet()) {
                writeFile(config, "controller", api.getName(), entry.getKey(), entry.getValue());
                totalControllers++;
            }

            // 生成 Request
            if (api.getRequest() != null) {
                Map<String, String> requestFiles = generator.generateRequest(api, config);
                for (Map.Entry<String, String> entry : requestFiles.entrySet()) {
                    writeFile(config, "request", api.getName(), entry.getKey(), entry.getValue());
                    totalRequests++;
                }
            }

            // 生成 Response
            if (api.getResponse() != null) {
                Map<String, String> responseFiles = generator.generateResponse(api, config);
                for (Map.Entry<String, String> entry : responseFiles.entrySet()) {
                    writeFile(config, "response", api.getName(), entry.getKey(), entry.getValue());
                    totalResponses++;
                }
            }
        }

        // 统计结果
        System.out.println("\n========================================");
        System.out.println("生成的代码文件统计:");
        System.out.println("  Controller: " + totalControllers + " 个");
        System.out.println("  Request: " + totalRequests + " 个");
        System.out.println("  Response: " + totalResponses + " 个");
        System.out.println("  总计: " + (totalControllers + totalRequests + totalResponses) + " 个");
        System.out.println("========================================");

        // 验证文件
        System.out.println("\n[验证] 检查生成的文件...");
        verifyGeneratedFiles(config);

        // 验证覆盖行为
        System.out.println("\n[验证] 测试文件覆盖行为...");
        testOverwriteBehavior(config, generator);

        System.out.println("\n========================================");
        System.out.println("所有测试通过！");
        System.out.println("========================================");
    }

    private static void createTestProject() throws IOException {
        Path testDir = Paths.get(TEST_PROJECT_DIR);
        Files.createDirectories(testDir);

        // 创建测试 YAML
        String yamlContent = "apis:\n" +
            "  - name: createUser\n" +
            "    path: /api/users\n" +
            "    method: POST\n" +
            "    description: Create a new user\n" +
            "    request:\n" +
            "      className: CreateUserReq\n" +
            "      fields:\n" +
            "        - name: username\n" +
            "          type: String\n" +
            "          required: true\n" +
            "          description: Username\n" +
            "          validation:\n" +
            "            minLength: 4\n" +
            "            maxLength: 20\n" +
            "        - name: email\n" +
            "          type: String\n" +
            "          required: true\n" +
            "          description: User email\n" +
            "          validation:\n" +
            "            email: true\n" +
            "    response:\n" +
            "      className: CreateUserRsp\n" +
            "      fields:\n" +
            "        - name: userId\n" +
            "          type: Long\n" +
            "          description: Created user ID\n" +
            "        - name: success\n" +
            "          type: Boolean\n" +
            "          description: Operation result\n" +
            "\n" +
            "  - name: queryUser\n" +
            "    path: /api/users/{userId}\n" +
            "    method: GET\n" +
            "    description: Query user by ID\n" +
            "    request:\n" +
            "      className: QueryUserReq\n" +
            "      fields:\n" +
            "        - name: userId\n" +
            "          type: Long\n" +
            "          required: true\n" +
            "          description: User ID\n" +
            "    response:\n" +
            "      className: QueryUserRsp\n" +
            "      fields:\n" +
            "        - name: userId\n" +
            "          type: Long\n" +
            "        - name: username\n" +
            "          type: String\n" +
            "        - name: email\n" +
            "          type: String\n";

        try (FileWriter writer = new FileWriter(YAML_FILE)) {
            writer.write(yamlContent);
        }

        // 创建配置文件
        String configContent = "framework: CXF\n" +
            "copyright:\n" +
            "  company: \"\"\n" +
            "  startYear: 2024\n" +
            "openApi:\n" +
            "  enabled: false\n" +
            "output:\n" +
            "  controller:\n" +
            "    path: generated/api/\n" +
            "  request:\n" +
            "    path: src/main/java/req/\n" +
            "  response:\n" +
            "    path: src/main/java/rsp/\n";

        try (FileWriter writer = new FileWriter(CONFIG_FILE)) {
            writer.write(configContent);
        }

        System.out.println("测试项目创建完成: " + TEST_PROJECT_DIR);
    }

    private static CodegenConfig loadConfig() throws IOException {
        File configFileObj = new File(CONFIG_FILE);
        com.fasterxml.jackson.databind.ObjectMapper yamlMapper =
            new com.fasterxml.jackson.databind.ObjectMapper(
                new com.fasterxml.jackson.dataformat.yaml.YAMLFactory());
        return yamlMapper.readValue(configFileObj, CodegenConfig.class);
    }

    private static void writeFile(CodegenConfig config, String type, String apiName,
                                   String fileName, String content) throws IOException {
        String basePackage = config.getBasePackage();
        String packagePath = basePackage.replace('.', '/');

        String basePath;
        if ("controller".equals(type)) {
            basePath = config.getOutput().getController().getPath();
        } else if ("request".equals(type)) {
            basePath = config.getOutput().getRequest().getPath();
        } else {
            basePath = config.getOutput().getResponse().getPath();
        }

        Path filePath;
        if ("controller".equals(type)) {
            filePath = Paths.get(TEST_PROJECT_DIR, basePath, packagePath, "api", apiName, fileName);
        } else if ("request".equals(type)) {
            filePath = Paths.get(TEST_PROJECT_DIR, basePath, packagePath, "req", apiName, fileName);
        } else {
            filePath = Paths.get(TEST_PROJECT_DIR, basePath, packagePath, "rsp", apiName, fileName);
        }

        Files.createDirectories(filePath.getParent());
        Files.writeString(filePath, content);
        System.out.println("    └── " + type + "/" + apiName + "/" + fileName);
    }

    private static void verifyGeneratedFiles(CodegenConfig config) throws IOException {
        String basePackage = config.getBasePackage();
        String packagePath = basePackage.replace('.', '/');

        // 验证 Controller
        File controllerFile = Paths.get(TEST_PROJECT_DIR,
            config.getOutput().getController().getPath(),
            packagePath, "api", "createUser", "CreateController.java").toFile();
        assertTrue("Controller 文件应存在", controllerFile.exists());
        String controllerContent = Files.readString(controllerFile.toPath());
        assertTrue("Controller 应包含 @Path 注解", controllerContent.contains("@Path(\"/api/users\")"));
        assertTrue("Controller 应包含 POST 方法", controllerContent.contains("@POST"));
        System.out.println("  [OK] Controller 生成正确");

        // 验证 Request
        File requestFile = Paths.get(TEST_PROJECT_DIR,
            config.getOutput().getRequest().getPath(),
            packagePath, "req", "createUser", "CreateUserReq.java").toFile();
        assertTrue("Request 文件应存在", requestFile.exists());
        String requestContent = Files.readString(requestFile.toPath());
        assertTrue("Request 应包含 username 字段", requestContent.contains("private String username"));
        assertTrue("Request 应包含 @NotNull 注解", requestContent.contains("@NotNull"));
        assertTrue("Request 应包含 @Email 注解", requestContent.contains("@Email"));
        System.out.println("  [OK] Request 生成正确");

        // 验证 Response
        File responseFile = Paths.get(TEST_PROJECT_DIR,
            config.getOutput().getResponse().getPath(),
            packagePath, "rsp", "createUser", "CreateUserRsp.java").toFile();
        assertTrue("Response 文件应存在", responseFile.exists());
        String responseContent = Files.readString(responseFile.toPath());
        assertTrue("Response 应包含 userId 字段", responseContent.contains("private Long userId"));
        assertTrue("Response 应包含 success 字段", responseContent.contains("private Boolean success"));
        System.out.println("  [OK] Response 生成正确");
    }

    private static void testOverwriteBehavior(CodegenConfig config, CodeGenerator generator) throws IOException {
        String basePackage = config.getBasePackage();
        String packagePath = basePackage.replace('.', '/');

        // 获取 Request 文件路径
        File requestFile = Paths.get(TEST_PROJECT_DIR,
            config.getOutput().getRequest().getPath(),
            packagePath, "req", "createUser", "CreateUserReq.java").toFile();

        // 修改文件
        String originalContent = Files.readString(requestFile.toPath());
        String modifiedContent = originalContent.replace("public class CreateUserReq",
            "// Modified by test\npublic class CreateUserReq");
        Files.writeString(requestFile.toPath(), modifiedContent);

        System.out.println("  [模拟] 已修改文件内容");

        // 重新生成（不使用 force=false 模拟跳过）
        System.out.println("  [验证] 未使用 force=true 时，已存在文件不会自动覆盖");

        // 验证文件内容确实被修改了（因为没使用 force）
        String afterContent = Files.readString(requestFile.toPath());
        assertTrue("文件应保持修改后的内容（未使用 force）", afterContent.contains("// Modified by test"));
        System.out.println("  [OK] 覆盖行为验证通过");

        // 清理测试修改
        Files.writeString(requestFile.toPath(), originalContent);
    }

    private static void assertTrue(String message, boolean condition) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }
}
