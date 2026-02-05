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
 * Usage: java -jar api-codegen.jar <yaml-file> [options]
 *
 * Options:
 *   -output, --outputDir <directory>  Output base directory (default: ./generated)
 *   -package, --basePackage <package>  Base package name (default: com.apicgen)
 *   -company <company>                 Copyright company name
 *   -framework <framework>              Framework type: cxf (default: cxf)
 *   -force                             Force overwrite existing files
 *   -help, --help                      Show this help message
 *
 * Examples:
 *   java -jar api-codegen.jar api.yaml
 *   java -jar api-codegen.jar api.yaml -output=src/main/java -package=com.example
 *   java -jar api-codegen.jar api.yaml --help
 */
public class Main {

    public static void main(String[] args) throws IOException {
        if (args.length < 1) {
            printHelp();
            System.exit(1);
        }

        // Check for help flag
        if (args[0].equals("-help") || args[0].equals("--help")) {
            printHelp();
            System.exit(0);
        }

        String yamlFilePath = args[0];
        File yamlFile = new File(yamlFilePath);

        if (!yamlFile.exists()) {
            System.err.println("Error: YAML file not found: " + yamlFile.getAbsolutePath());
            System.exit(1);
        }

        // Parse command line options
        String outputDir = "generated";
        String basePackage = "com.apicgen";
        String company = "";
        String framework = "cxf";
        boolean force = false;

        for (int i = 1; i < args.length; i++) {
            String arg = args[i];
            // Support both "-output value" and "-output=value" formats
            if (arg.startsWith("-output=")) {
                outputDir = arg.substring(8);
            } else if (arg.equals("-output") || arg.equals("--outputDir")) {
                if (i + 1 < args.length) {
                    outputDir = args[++i];
                }
            } else if (arg.startsWith("-package=") || arg.startsWith("--basePackage=")) {
                basePackage = arg.substring(arg.indexOf('=') + 1);
            } else if (arg.equals("-package") || arg.equals("--basePackage")) {
                if (i + 1 < args.length) {
                    basePackage = args[++i];
                }
            } else if (arg.startsWith("-company=")) {
                company = arg.substring(9);
            } else if (arg.equals("-company")) {
                if (i + 1 < args.length) {
                    company = args[++i];
                }
            } else if (arg.startsWith("-framework=")) {
                framework = arg.substring(11);
            } else if (arg.equals("-framework")) {
                if (i + 1 < args.length) {
                    framework = args[++i];
                }
            } else if (arg.equals("-force")) {
                force = true;
            }
        }

        System.out.println("========================================");
        System.out.println("API Code Generator - Standalone Mode");
        System.out.println("========================================\n");
        System.out.println("Input YAML: " + yamlFile.getAbsolutePath());

        // Parse YAML
        ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
        System.out.println("Parsed " + apiDefinition.getApis().size() + " API(s)\n");

        // Create config
        CodegenConfig config = createDefaultConfig();
        config.setBasePackage(basePackage);
        config.getCopyright().setCompany(company);

        try {
            config.setFramework(CodegenConfig.FrameworkType.valueOf(framework.toUpperCase()));
        } catch (IllegalArgumentException e) {
            System.err.println("Warning: Unknown framework '" + framework + "', using default: CXF");
            config.setFramework(CodegenConfig.FrameworkType.CXF);
        }

        // Get code generator
        CodeGenerator generator = CodeGeneratorFactory.getGenerator(config);

        // Output directory
        Path outputBase = Paths.get(outputDir).toAbsolutePath();
        System.out.println("Output directory: " + outputBase);

        // Generate code for all APIs
        for (Api api : apiDefinition.getApis()) {
            System.out.println("\nGenerating: " + api.getName());

            // Generate Controller
            Map<String, String> controllerFiles = generator.generateController(api, config);
            writeFiles(outputBase.resolve("controller").resolve(api.getName()), controllerFiles, force);

            // Generate Request
            if (api.getRequest() != null) {
                Map<String, String> requestFiles = generator.generateRequest(api, config);
                writeFiles(outputBase.resolve("request").resolve(api.getName()), requestFiles, force);
            }

            // Generate Response
            if (api.getResponse() != null) {
                Map<String, String> responseFiles = generator.generateResponse(api, config);
                writeFiles(outputBase.resolve("response").resolve(api.getName()), responseFiles, force);
            }
        }

        System.out.println("\n========================================");
        System.out.println("Code generation completed!");
        System.out.println("Output: " + outputBase);
        System.out.println("========================================");
    }

    private static void printHelp() {
        System.out.println("""
            API Code Generator - Standalone Mode

            Usage: java -jar api-codegen.jar <yaml-file> [options]

            Options:
              -output, --outputDir <directory>  Output base directory (default: ./generated)
              -package, --basePackage <package>  Base package name (default: com.apicgen)
              -company <company>                 Copyright company name
              -framework <framework>              Framework type: cxf (default: cxf)
              -force                             Force overwrite existing files
              -help, --help                      Show this help message

            Examples:
              java -jar api-codegen.jar api.yaml
              java -jar api-codegen.jar api.yaml -output=src/main/java -package=com.example
              java -jar api-codegen.jar api.yaml --help
            """);
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

    private static void writeFiles(Path dir, Map<String, String> files, boolean force) throws IOException {
        Files.createDirectories(dir);
        for (Map.Entry<String, String> entry : files.entrySet()) {
            Path filePath = dir.resolve(entry.getKey());
            if (Files.exists(filePath) && !force) {
                System.out.println("  └── " + entry.getKey() + " (skipped, exists)");
            } else {
                Files.writeString(filePath, entry.getValue());
                System.out.println("  └── " + entry.getKey());
            }
        }
    }
}
