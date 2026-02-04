package com.apicgen;

import com.apicgen.config.CodegenConfig;
import com.apicgen.generator.CodeGenerator;
import com.apicgen.generator.CodeGeneratorFactory;
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
 * Main entry point for standalone API code generation.
 *
 * Usage: java -cp api-codegen-core/target/api-codegen-core-1.0.0.jar com.apicgen.Main <yaml-file>
 *
 * Example:
 *   java -cp api-codegen-core/target/api-codegen-core-1.0.0.jar com.apicgen.Main api-example.yaml
 */
public class Main {

    public static void main(String[] args) throws IOException {
        if (args.length < 1) {
            System.err.println("Usage: java -cp <jar> com.apicgen.Main <yaml-file>");
            System.err.println("Example: java -cp api-codegen-core-1.0.0.jar com.apicgen.Main api-example.yaml");
            System.exit(1);
        }

        String yamlFilePath = args[0];
        File yamlFile = new File(yamlFilePath);

        if (!yamlFile.exists()) {
            System.err.println("Error: YAML file not found: " + yamlFile.getAbsolutePath());
            System.exit(1);
        }

        System.out.println("========================================");
        System.out.println("API Code Generator - Standalone Mode");
        System.out.println("========================================\n");
        System.out.println("Input YAML: " + yamlFile.getAbsolutePath());

        // Parse YAML
        ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
        System.out.println("Parsed " + apiDefinition.getApis().size() + " API(s)\n");

        // Create default config
        CodegenConfig config = createDefaultConfig();

        // Get code generator
        CodeGenerator generator = CodeGeneratorFactory.getGenerator(config);

        // Output directory
        Path outputBase = Paths.get(".").toAbsolutePath().resolve("generated");
        System.out.println("Output directory: " + outputBase);

        // Generate code for all APIs
        for (Api api : apiDefinition.getApis()) {
            System.out.println("\nGenerating: " + api.getName());

            // Generate Controller
            Map<String, String> controllerFiles = generator.generateController(api, config);
            writeFiles(outputBase.resolve("controller").resolve(api.getName()), controllerFiles);

            // Generate Request
            if (api.getRequest() != null) {
                Map<String, String> requestFiles = generator.generateRequest(api, config);
                writeFiles(outputBase.resolve("request").resolve(api.getName()), requestFiles);
            }

            // Generate Response
            if (api.getResponse() != null) {
                Map<String, String> responseFiles = generator.generateResponse(api, config);
                writeFiles(outputBase.resolve("response").resolve(api.getName()), responseFiles);
            }
        }

        System.out.println("\n========================================");
        System.out.println("Code generation completed!");
        System.out.println("Output: " + outputBase);
        System.out.println("========================================");
    }

    private static CodegenConfig createDefaultConfig() {
        CodegenConfig config = new CodegenConfig();
        config.setFramework(CodegenConfig.FrameworkType.CXF);
        config.setBasePackage("com.apicgen");

        CodegenConfig.CopyrightConfig copyright = new CodegenConfig.CopyrightConfig();
        copyright.setCompany("");
        copyright.setStartYear(2024);
        config.setCopyright(copyright);

        CodegenConfig.OutputConfig output = new CodegenConfig.OutputConfig();
        output.setController(new CodegenConfig.PathConfig());
        output.setRequest(new CodegenConfig.PathConfig());
        output.setResponse(new CodegenConfig.PathConfig());
        config.setOutput(output);

        CodegenConfig.OpenApiConfig openApi = new CodegenConfig.OpenApiConfig();
        openApi.setEnabled(false);
        config.setOpenApi(openApi);

        return config;
    }

    private static void writeFiles(Path dir, Map<String, String> files) throws IOException {
        Files.createDirectories(dir);
        for (Map.Entry<String, String> entry : files.entrySet()) {
            Path filePath = dir.resolve(entry.getKey());
            Files.writeString(filePath, entry.getValue());
            System.out.println("  └── " + entry.getKey());
        }
    }
}
