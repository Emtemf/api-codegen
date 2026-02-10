# API CodeGen IntelliJ IDEA Plugin

A powerful IntelliJ IDEA plugin for YAML-based API code generation with validation analysis.

## Features

- **YAML Validation Analysis**: Detect missing validation rules in your API definitions
- **Auto-fix**: Automatically add validation rules to your YAML files
- **Code Generation**: Generate Controller, Request, and Response classes
- **Side Tool Window**: Easy-to-use UI integrated into IntelliJ IDEA

## Dependency on Core Module

This plugin depends on **api-codegen-core** JAR. Before building, ensure the core module is published to local Maven:

```bash
# In the main api-codegen project:
cd api-codegen
mvn install -DskipTests -pl api-codegen-core
```

## Development Setup

### Prerequisites

- **IntelliJ IDEA 2024.1 or later** (Ultimate or Community Edition)
- JDK 17 or later
- **api-codegen-core:1.0.0** must be installed in local Maven (`~/.m2/repository/`)

### Opening the Plugin Project

The plugin is designed to be developed **inside IntelliJ IDEA**:

1. **Open this project in IntelliJ IDEA:**
   - `File > Open` > Select `api-codegen-intellij-standalone/` folder
   - Or use: `File > New > Project from Existing Sources`

2. **Configure SDK:**
   - Go to `File > Project Structure > Project Settings > Project
   - SDK 选择 `IntelliJ IDEA IU-241.0` (Ultimate) 或 `IC-241.0` (Community)
   - Set Language level to `17`

3. **The IntelliJ Platform SDK will be automatically available** when opened as an IDEA project

> **Note:** Ultimate 版本功能更完整，推荐使用

### Before First Build

1. Ensure core module is installed to local Maven:
   ```bash
   cd /path/to/api-codegen
   mvn install -DskipTests -pl api-codegen-core
   ```

2. Refresh Gradle project in IntelliJ

### Running the Plugin

1. In IntelliJ IDEA, find the `ApiCodegenPlugin` class
2. Right-click and select `Run Plugin` (or use the run configuration)
3. A new IntelliJ instance will launch with the plugin installed
4. Open your API project in the new instance to test

### Building the Plugin JAR

Use the Gradle wrapper (included):

```bash
# Build the plugin JAR
cd api-codegen-intellij
./gradlew build

# The plugin will be at:
# build/distributions/api-codegen-intellij-1.0.0.zip
```

Or using the Gradle tasks view in IntelliJ IDEA:
- `Tasks > build > build`

### Installing the Plugin Manually

1. Build the plugin using the steps above
2. Extract the ZIP file from `build/distributions/`
3. Open IntelliJ IDEA
4. Go to `File > Settings > Plugins`
5. Click the gear icon and select `Install Plugin from Disk...`
6. Select the extracted JAR file
7. Restart IntelliJ IDEA

## Plugin Architecture

```
api-codegen-intellij/
├── src/main/
│   ├── java/com/apicgen/intellij/
│   │   ├── ApiCodegenPlugin.java          # Plugin main class
│   │   ├── ui/
│   │   │   └── ApiCodegenToolWindowPanel.java  # Main UI panel
│   │   ├── toolwindow/
│   │   │   └── ApiCodegenToolWindowFactory.java # Tool window factory
│   │   ├── actions/
│   │   │   ├── AnalyzeAction.java        # Analyze action
│   │   │   ├── AutoFixAction.java        # Auto-fix action
│   │   │   ├── GenerateCodeAction.java   # Generate code action
│   │   │   └── RefreshAction.java        # Refresh action
│   │   ├── dialog/
│   │   │   ├── AutoFixConfirmDialog.java  # Fix confirmation
│   │   │   └── GenerateConfirmDialog.java # Generation confirmation
│   │   ├── service/
│   │   │   └── ApiCodegenProjectService.java # Project service
│   │   └── activity/
│   │       └── ProjectStartupActivity.java   # Startup activity
│   └── resources/
│       ├── META-INF/plugin.xml            # Plugin descriptor
│       └── messages/ApiCodegenBundle.properties
└── build.gradle                           # Gradle build configuration
```

## Integration with Core Module

The plugin reuses the core module classes:
- `com.apicgen.validator.ApiValidator` - YAML validation
- `com.apicgen.validator.ValidationFixer` - Auto-fix functionality
- `com.apicgen.core.ApiCodegenCore` - Code generation

## Usage

### Opening the Tool Window

1. Go to `Tools > API CodeGen` in the menu
2. Or use the shortcut: `Ctrl + Alt + A`

### Select YAML File

The plugin automatically scans for YAML files in your project root. Select one from the dropdown:

```
YAML 文件: [api-example.yaml ▼] [+ 手动输入] [刷新]
```

### Validation Analysis

1. Select a YAML file
2. Click **分析** (Analyze)
3. View issues in the table:
   - **ERROR**: Critical issues (required fields missing validation)
   - **WARN**: Suggested validations

### Auto-fix

1. Run analysis first
2. Click **修复** (Fix)
3. Review the changes in the confirmation dialog
4. Confirm to apply fixes
5. The original file will be backed up as `.backup`

### Code Generation

1. Select a YAML file
2. Choose what to generate:
   - `☐ Controller → generated/api/` (manual copy required)
   - `☑ Request → src/main/java/req/` (overwrite)
   - `☑ Response → src/main/java/rsp/` (overwrite)
3. Click **生成** (Generate)
4. Confirm in the dialog to proceed

## Configuration

The plugin uses `codegen-config.yaml` from your project root:

```yaml
framework:
  type: cxf

copyright:
  company: ""
  startYear: 2024

output:
  controller:
    path: generated/api/
  request:
    path: src/main/java/req/
  response:
    path: src/main/java/rsp/
```

## Supported Validation Rules

| Field Type | Validation Rules |
|------------|-----------------|
| String | `minLength`, `maxLength`, `pattern`, `email` |
| Integer/Long | `min`, `max` |
| Double | `min`, `max` |
| List | `minSize`, `maxSize` |
| LocalDate | `past`, `future` |
| LocalDateTime | `past`, `future` |

## Requirements

- IntelliJ IDEA 2024.1 or later
- JDK 17 or later

## License

Apache License 2.0
