# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Java API code generator that generates JAX-RS (CXF) and Spring MVC code from YAML definitions. Generates Controller, Request, and Response classes with JSR-303 validation annotations.

## Project Structure

This repository contains **ONE** project, with a **separate IntelliJ plugin project**:

| Location | Type | Build System | Java Version |
|----------|------|--------------|--------------|
| `D:\idea\workSpace\api-codegen\` | Main Project | Maven | Java 21 |
| `D:\idea\workSpace\api-codegen-intellij-standalone\` | IntelliJ Plugin | Gradle | Java 17 |

**Important:** The IntelliJ plugin is in a SEPARATE directory and is a separate Git repository.

## Developer Workflow

```
1. Design API in YAML (api.yaml)
2. Configure output paths (codegen-config.yaml)
3. Run: mvn api-codegen:generate
4. Copy Controller → add business logic
5. Req/Rsp auto-overwrite on re-run
```

## Requirements

- **JDK 21** (required for running the core module)
- **IntelliJ IDEA SDK** (automatically available when developing the plugin)
- **JDK 17** (for building the IntelliJ plugin)

## Build Commands

```bash
# Set JDK 21 environment (required)
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.10"
export PATH="$JAVA_HOME/bin:$PATH"

# Build entire project (core + maven plugin)
mvn clean install

# Build just core module
cd api-codegen-core && mvn clean install

# Run tests
mvn test

# Run a single test
mvn test -Dtest=TestClassName
```

**Requirements:**
- JDK 21 or higher (set `JAVA_HOME` to JDK 21)
- Maven 3.8+

## Running the Maven Plugin

**First, ensure JDK 21 is set:**
```bash
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.10"
export PATH="$JAVA_HOME/bin:$PATH"
```

**Then run the plugin:**
```bash
# Use full groupId (recommended)
mvn com.apicgen:api-codegen-maven-plugin:generate

# Or use short form (after plugin is installed to local repo)
mvn api-codegen:generate

# Force overwrite existing files
mvn com.apicgen:api-codegen-maven-plugin:generate -Dforce=true

# With custom YAML path and output dir
mvn com.apicgen:api-codegen-maven-plugin:generate -DyamlFile=src/main/resources/api.yaml

# With custom base package
mvn com.apicgen:api-codegen-maven-plugin:generate -DbasePackage=com.example.api

# With custom company name
mvn com.apicgen:api-codegen-maven-plugin:generate -Dcompany="MyCompany"

# With custom config file
mvn com.apicgen:api-codegen-maven-plugin:generate -DconfigFile=custom-config.yaml
```

## Output Strategy

| File Type | Path | Overwrite | Usage |
|-----------|------|-----------|-------|
| Controller | `generated/api/` | NO | Copy to project, add business logic |
| Request | `src/main/java/req/` | YES | Auto-overwrite, never edit manually |
| Response | `src/main/java/rsp/` | YES | Auto-overwrite, never edit manually |

**Why this design:**
- Re-running `mvn api-codegen:generate` won't break your code
- Controller is separated to avoid accidental overwrites of business logic
- Req/Rsp are regenerated from YAML - they are derived artifacts

## Example: Adding a New API

### Step 1: Create API Design (api.yaml)

```yaml
apis:
  - name: createUser
    path: /api/users
    method: POST
    description: Create a new user
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
          required: true
          description: Username
          validation:
            minLength: 4
            maxLength: 20
            pattern: "^[a-zA-Z0-9_]+$"
        - name: email
          type: String
          required: true
          description: User email
          validation:
            email: true
    response:
      className: CreateUserRsp
      fields:
        - name: userId
          type: Long
          description: Created user ID
        - name: success
          type: Boolean
          description: Operation result
```

### Step 2: Configure (codegen-config.yaml)

```yaml
framework:
  type: cxf

copyright:
  company: ""
  startYear: 2024

output:
  controller:
    path: src/main/java/com/example/api/controller/
  request:
    path: src/main/java/com/example/req/
  response:
    path: src/main/java/com/example/rsp/
```

### Step 3: Run and Use

```bash
mvn api-codegen:generate
```

**Output:**
```
generated/api/com/example/api/controller/CreateController.java
src/main/java/com/example/req/com/example/req/CreateUserReq.java
src/main/java/com/example/rsp/com/example/rsp/CreateUserRsp.java
```

**Next:**
1. Copy `CreateController.java` to your project
2. Implement the business logic
3. When API changes, re-run `mvn api-codegen:generate -Dforce=true`
4. Req/Rsp are auto-updated, re-copy Controller if needed

## Running Standalone

**Prerequisites:** JDK 21

```bash
# First build the project
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.10"
export PATH="$JAVA_HOME/bin:$PATH"
mvn clean install -DskipTests

# Then run standalone using Maven exec plugin (includes dependencies)
cd api-codegen-core
mvn exec:java -Dexec.mainClass="com.apicgen.Main" -Dexec.args="api-example.yaml"

# Or run directly with all dependencies (requires classpath with all JARs)
java -cp "target/api-codegen-core-1.0.0.jar;target/dependency/*" com.apicgen.Main api-example.yaml
```

**Note:** Direct `java -cp` requires all dependencies (Jackson, JavaPoet, etc.) in the classpath. Using `mvn exec:java` is recommended as it handles dependencies automatically.

## Architecture

Multi-module Maven project with two modules:

### `api-codegen-core` (Core Library)

- **model/**: Data models (`ApiDefinition`, `Api`, `ClassDefinition`, `FieldDefinition`, `ValidationConfig`)
- **parser/**: YAML parsing using Jackson/YAMLFactory (`YamlParser`)
- **validator/**: Validates YAML definitions (`ApiValidator` enforces DFX rules, circular references)
- **generator/**: Code generation framework
  - `CodeGenerator` interface: `generateController()`, `generateRequest()`, `generateResponse()`
  - `CodeGeneratorFactory`: Returns CXF or Spring generator based on config
  - `cxf/CxfCodeGenerator`: JAX-RS implementation using JavaPoet
  - `spring/SpringCodeGenerator`: Placeholder (not implemented - requires v2.0.x)
- **config/**: Configuration loaded from `codegen-config.yaml`
- **util/**: `CodeGenUtil` with utility methods

### `api-codegen-maven-plugin` (Maven Plugin)

- `ApiCodegenMojo`: Executes at `GENERATE_SOURCES` phase
- Parameters: `yamlFile`, `outputDir`, `basePackage`, `framework`, `company`, `startYear`, `openapi`, `force`, `configFile`
- Configuration file `codegen-config.yaml` can be overridden by CLI parameters

## YAML Schema

This tool supports **two YAML formats**:

### 1. Custom API Format (Internal Use)

```yaml
apis:
  - name: createUser          # API method name
    path: /api/users           # Must start with /
    method: POST               # GET/POST/PUT/DELETE/PATCH
    description: API description
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String         # String, Integer, Long, Double, Boolean, LocalDate, LocalDateTime, List<T>, Enum, or custom object
          required: true
          description: Field description
          validation:
            minLength: 4
            maxLength: 20
            pattern: "^[a-zA-Z0-9_]+$"
            email: true        # For String types
            min: 0             # For numeric types (DFX: default 0)
            max: 100           # For numeric types (required)
            minSize: 1         # For List types
            maxSize: 10        # For List types (DFX: must be > 0)
            elementValidation: # For List element types
              minLength: 2
              maxLength: 10
            past: true         # For date types
            future: true       # For date types
          enumValues: [ADMIN, USER]  # Required for Enum type (generates String field)
          fields:              # For nested object types
            - name: nestedField
              type: String
              required: false
    response:
      className: CreateUserRsp
      fields:
        - name: userId
          type: Long
          description: User ID
```

### 2. Swagger / OpenAPI Format (Recommended)

The tool automatically converts Swagger 2.0 and OpenAPI 3.0 formats to internal format:

```yaml
# Swagger 2.0
swagger: "2.0"
info:
  title: User API
  version: "1.0"
paths:
  /users:
    get:
      summary: Query users
      operationId: queryUsers
      parameters:
        - name: page
          in: query
          description: Page number
          schema:
            type: integer
      responses:
        200:
          description: Success

# OpenAPI 3.0
openapi: "3.0.0"
info:
  title: User API
  version: "1.0"
paths:
  /users:
    get:
      operationId: queryUsers
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        200:
          description: Success
```

## Validation Auto-Fix Rules

The analyzer automatically adds validation rules for Swagger/OpenAPI parameters:

### String Parameters
| Field Pattern | Validation Added |
|--------------|-----------------|
| Contains `email`, `mail` | `pattern` (email regex) |
| Contains `phone`, `mobile` | `pattern` (phone regex: `^(\\+86\|86)?1[3-9]\\d{9}$`) |
| Contains `url`, `link` | `pattern` (URL regex) |
| Default | `minLength=1, maxLength=255` |

### Integer/Number Parameters
| Field Pattern | Validation Added |
|--------------|-----------------|
| `page`, `pageNum` | `minimum=1, maximum=2147483647` |
| Contains `size`, `limit` | `minimum=1, maximum=100` |
| Contains `age` | `minimum=0, maximum=150` |
| Contains `score`, `rate` | `minimum=0, maximum=100` |
| Contains `price`, `amount`, `total` | `minimum=0` |
| Default (not id) | `minimum=0, maximum=2147483647` |

### Other Auto-Fixes
- `required=true` parameters → adds `@NotNull` annotation
- Path with `//` → removes duplicate slashes
- Path with `/XXX/` prefix → removes placeholder prefix
- Missing `description` → adds description from field name
- Missing `operationId` → generates from summary

## Configuration File (`codegen-config.yaml`)

```yaml
framework:
  type: cxf              # cxf or spring

copyright:
  company: ""            # Company name (empty to omit from copyright header)
  startYear: 2024

openapi:
  enabled: false
  version: "3.0"

output:
  controller:
    path: generated/api/    # Controllers (manual copy)
  request:
    path: src/main/java/req/ # Requests (auto-overwrite)
  response:
    path: src/main/java/rsp/ # Responses (auto-overwrite)
```

## Key Design Notes

1. **Unified Controller (v1.1.0+)**: One YAML file → one Controller class (e.g., `ExampleApi` for `basePackage=com.example.api`). All API methods grouped in single class.

2. **Output Strategy**: Controllers go to `generated/api/` (user copies manually), Request/Response classes go to `src/main/java/req/` and `src/main/java/rsp/` (auto-overwrite, no manual edits)

3. **Custom Annotations**: Configure in `codegen-config.yaml`:
   ```yaml
   customAnnotations:
     classAnnotations: ["@Secured", "@AuditLog"]
     methodAnnotations: ["@Permission(\"default\")"]
   ```

4. **DFX Principles**: Validator enforces defensive rules:
   - `maxSize` must be > 0 (error)
   - `min` should be >= 0 (warning)
   - `minLength` cannot exceed `maxLength`
   - `minSize` cannot exceed `maxSize`

5. **Circular Reference Detection**: `CodeGenUtil.hasCircularReference()` uses visited set tracking

6. **Controller Naming Convention**: Based on API name prefix:
   - `create*` → `CreateController`
   - `update*` → `UpdateController`
   - `delete*` → `DeleteController`
   - `query*`, `get*` → `QueryController`
   - otherwise → `{CapitalizedName}Controller`

7. **Enum Handling**: `type: Enum` generates a `String` field with `enumValues` as documentation

## Web UI (`web-ui/`)

Browser-based YAML editor with real-time validation, auto-fix, and code preview.

```bash
# Start local server
cd web-ui && npx serve -l 8080
# Or simply open web-ui/index.html in browser

# Run all tests
cd web-ui && npm test
```

**Key files:**
- `index.html` - Main UI
- `js/analyzer.js` - YAML analysis logic (mirrors Java validator rules)
- `test/analyzer-test.js` - 37 unit tests for analyzer
- `test/render-test.js` - 16 unit tests for UI rendering

**Features:**
- CodeMirror YAML editor with syntax highlighting
- Real-time validation analysis
- Auto-fix for validation rules
- Diff preview showing before/after code
- Supports Swagger 2.0 and OpenAPI 3.0 formats

## IntelliJ IDEA Plugin Development

**Location:** `D:\idea\workSpace\api-codegen-intellij-standalone\` (SEPARATE Git repository)

**Why separate?** IntelliJ Platform SDK requires Gradle + Java 17, not available in Maven Central.

### Before Developing the Plugin

1. Install core module: `mvn install -DskipTests -pl api-codegen-core`
2. Open `D:\idea\workSpace\api-codegen-intellij-standalone\` as Gradle project
3. Configure SDK: IntelliJ IDEA (IU/IC-241.0), Language level: 17
4. Run: Right-click `ApiCodegenPlugin.java` > `Run Plugin`

### Plugin Structure

```
api-codegen-intellij-standalone/
├── src/main/java/com/apicgen/intellij/
│   ├── ApiCodegenPlugin.java          # Plugin entry point
│   ├── actions/                       # Analyze, AutoFix, GenerateCode actions
│   ├── ui/ApiCodegenToolWindowPanel.java
│   └── service/                       # Project service
└── src/main/resources/META-INF/plugin.xml
```

## Technology Stack

- **Java 21** - Core module runtime and development
- **Java 17** - IntelliJ plugin development (required by IntelliJ Platform SDK)
- Jackson 2.18.0 (YAML parsing)
- JavaPoet 1.13.0 (code generation)
- Lombok 1.18.34
- JUnit 5.11.0

## MCP Server (`mcp-server/`)

Custom MCP server for browser automation and screenshots.

```bash
cd mcp-server && npm install
node server.js   # Start MCP server
node screenshot.js  # Screenshot utility
```

**Dependencies:** puppeteer-core (browser automation)

## Claude Code Configuration

### MCP Servers (`C:\Users\Administrator\.claude\claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:/idea/workSpace/api-codegen"]
    },
    "git": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-git"]
    }
  }
}
```

### Skills Location

`C:\Users\Administrator\.claude\skills\`
