package com.apicgen;

import com.apicgen.config.CodegenConfig;
import com.apicgen.generator.CodeGenerator;
import com.apicgen.generator.CodeGeneratorFactory;
import com.apicgen.model.Api;
import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import com.apicgen.validator.ApiValidator;
import com.apicgen.validator.ValidationAnalyzer;
import com.apicgen.validator.ValidationAnalyzer.AnalysisItem;
import com.apicgen.validator.ValidationAnalyzer.AnalysisSummary;
import com.apicgen.validator.ValidationFixer;
import com.apicgen.validator.ValidationResult;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

/**
 * Main entry point for standalone API code generation.
 *
 * Usage: java -jar api-codegen.jar <yaml-file> [options]
 *
 * Options:
 *   -output, --outputDir <directory>  Output base directory (default: ./generated)
 *   -package, --basePackage <package>  Base package name (default: com.apicgen)
 *   -company <text>                  Copyright声明，直接放到文件顶部
 *   -framework <framework>              Framework type: cxf (default: cxf)
 *   -force                             Force overwrite existing files
 *   -analyze                           Analyze missing validation rules
 *   -auto-fix                          Auto-fix missing validations
 *   -help, --help                      Show this help message
 *
 * Examples:
 *   java -jar api-codegen.jar api.yaml
 *   java -jar api-codegen.jar api.yaml -output=src/main/java -package=com.example
 *   java -jar api-codegen.jar api.yaml --analyze
 *   java -jar api-codegen.jar api.yaml --auto-fix
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
        boolean analyze = false;
        boolean autoFix = false;

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
            } else if (arg.equals("-analyze") || arg.equals("--analyze")) {
                analyze = true;
            } else if (arg.equals("-auto-fix") || arg.equals("--auto-fix")) {
                autoFix = true;
            }
        }

        System.out.println("========================================");
        System.out.println("API Code Generator - Standalone Mode");
        System.out.println("========================================\n");
        System.out.println("Input YAML: " + yamlFile.getAbsolutePath());

        // Parse YAML
        ApiDefinition apiDefinition;
        try {
            apiDefinition = YamlParser.parse(yamlFile);
        } catch (IOException e) {
            System.err.println("========================================");
            System.err.println("YAML Parse Error:");
            System.err.println("========================================");
            System.err.println(e.getMessage());
            System.exit(1);
            return;
        }
        System.out.println("Parsed " + apiDefinition.getApis().size() + " API(s)\n");

        // Handle analyze mode
        if (analyze || autoFix) {
            runValidationAnalysis(apiDefinition, autoFix, yamlFile);
            if (autoFix) {
                return; // Auto-fix already wrote the file and exited
            }
            if (analyze) {
                return; // Just analysis, exit here
            }
        }

        // Validate YAML
        ApiValidator validator = new ApiValidator();
        ValidationResult validationResult = validator.validate(apiDefinition);
        if (!validationResult.isValid()) {
            System.err.println("========================================");
            System.err.println("YAML Validation Failed:");
            System.err.println("========================================");
            System.err.println(validationResult.getErrorMessage());
            System.exit(1);
        }
        System.out.println("YAML validation passed\n");

        // Create config
        CodegenConfig config = createDefaultConfig();
        config.setBasePackage(basePackage);
        config.setCopyright(company);

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

    /**
     * Run validation analysis
     */
    private static void runValidationAnalysis(ApiDefinition apiDefinition, boolean autoFix, File yamlFile) {
        ValidationAnalyzer analyzer = new ValidationAnalyzer();
        AnalysisSummary summary = analyzer.summarize(apiDefinition);

        System.out.println("========================================");
        System.out.println("Validation Analysis");
        System.out.println("========================================\n");

        if (!summary.hasIssues()) {
            System.out.println("No validation issues found. Great job!\n");
            return;
        }

        // Print summary
        System.out.println("Summary:");
        System.out.println("  Errors:   " + summary.getErrorCount());
        System.out.println("  Warnings: " + summary.getWarningCount());
        System.out.println("  Info:     " + summary.getInfoCount());
        System.out.println("  Total:    " + summary.getTotalCount());
        System.out.println();

        // Get detailed analysis
        List<AnalysisItem> issues = analyzer.analyze(apiDefinition);

        // Print issues by severity
        System.out.println("Issues:");
        printIssuesBySeverity(issues, AnalysisItem.Severity.ERROR);
        printIssuesBySeverity(issues, AnalysisItem.Severity.WARNING);
        printIssuesBySeverity(issues, AnalysisItem.Severity.INFO);

        // Auto-fix
        if (autoFix) {
            System.out.println("\n========================================");
            System.out.println("Auto-Fix Mode");
            System.out.println("========================================\n");

            ValidationFixer fixer = new ValidationFixer();
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Write to file
            String fixedFilePath = yamlFile.getAbsolutePath();
            try {
                Files.writeString(yamlFile.toPath(), fixedYaml);
                System.out.println("Auto-fixed! Updated: " + fixedFilePath);
                System.out.println("\nFixed " + summary.getTotalCount() + " issue(s)");
            } catch (IOException e) {
                System.err.println("Failed to write fixed YAML: " + e.getMessage());
                // Try writing to fixed file
                String backupPath = yamlFile.getAbsolutePath().replace(".yaml", "-fixed.yaml");
                try {
                    Files.writeString(Paths.get(backupPath), fixedYaml);
                    System.out.println("Wrote fixed version to: " + backupPath);
                } catch (IOException ex) {
                    System.err.println("Failed to write backup file: " + ex.getMessage());
                }
            }
        } else {
            System.out.println("\n========================================");
            System.out.println("To auto-fix these issues, run:");
            System.out.println("  java -jar api-codegen.jar " + yamlFile.getName() + " --auto-fix");
            System.out.println("========================================");
        }
    }

    /**
     * Print issues by severity
     */
    private static void printIssuesBySeverity(List<AnalysisItem> issues, AnalysisItem.Severity severity) {
        for (AnalysisItem issue : issues) {
            if (issue.getSeverity() == severity) {
                System.out.println("  " + issue);
            }
        }
    }

    private static void printHelp() {
        System.out.println("""
            API Code Generator - Standalone Mode

            Usage: java -jar api-codegen.jar <yaml-file> [options]

            Options:
              -output, --outputDir <directory>  Output base directory (default: ./generated)
              -package, --basePackage <package>  Base package name (default: com.apicgen)
              -company <text>                  Copyright声明，直接放到文件顶部
              -framework <framework>              Framework type: cxf (default: cxf)
              -force                             Force overwrite existing files
              -analyze, --analyze                Analyze missing validation rules
              -auto-fix, --auto-fix              Auto-fix missing validations
              -help, --help                      Show this help message

            Examples:
              java -jar api-codegen.jar api.yaml
              java -jar api-codegen.jar api.yaml -output=src/main/java -package=com.example
              java -jar api-codegen.jar api.yaml --analyze
              java -jar api-codegen.jar api.yaml --auto-fix
              java -jar api-codegen.jar api.yaml --help
            """);
    }

    private static CodegenConfig createDefaultConfig() {
        CodegenConfig config = new CodegenConfig();
        config.setFramework(CodegenConfig.FrameworkType.CXF);
        config.setBasePackage("com.apicgen");
        config.setCopyright("");

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
