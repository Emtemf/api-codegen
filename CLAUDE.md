# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Java API code generator that generates JAX-RS (CXF) and Spring MVC code from YAML definitions. Generates Controller, Request, and Response classes with JSR-303 validation annotations.

## Developer Workflow

```
1. Design API in YAML (api.yaml)
2. Configure output paths (codegen-config.yaml)
3. Run: mvn api-codegen:generate
4. Copy Controller → add business logic
5. Req/Rsp auto-overwrite on re-run
```

## Build Commands

```bash
# Build entire project (core + maven plugin)
mvn clean install

# Build just core module
cd api-codegen-core && mvn clean install

# Run tests
mvn test

# Run a single test
mvn test -Dtest=TestClassName
```

## Running the Maven Plugin

```bash
# Generate code (skip existing files by default)
mvn api-codegen:generate

# Force overwrite existing files
mvn api-codegen:generate -Dforce=true

# With custom YAML path and output dir
mvn api-codegen:generate -DyamlFile=src/main/resources/api.yaml -DoutputDir=src/main/java

# With custom base package
mvn api-codegen:generate -DbasePackage=com.example.api

# With custom company name
mvn api-codegen:generate -Dcompany="MyCompany"

# With custom config file
mvn api-codegen:generate -DconfigFile=custom-config.yaml
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

```bash
# First build the project
mvn clean install -DskipTests

# Then run standalone
java -cp api-codegen-core/target/api-codegen-core-1.0.0.jar com.apicgen.Main api-example.yaml
```

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

1. **Output Strategy**: Controllers go to `generated/api/` (user copies manually), Request/Response classes go to `src/main/java/req/` and `src/main/java/rsp/` (auto-overwrite, no manual edits)

2. **DFX Principles**: Validator enforces defensive rules:
   - `maxSize` must be > 0 (error)
   - `min` should be >= 0 (warning)
   - `minLength` cannot exceed `maxLength`
   - `minSize` cannot exceed `maxSize`

3. **Circular Reference Detection**: `CodeGenUtil.hasCircularReference()` uses visited set tracking

4. **Controller Naming Convention**: Based on API name prefix:
   - `create*` → `CreateController`
   - `update*` → `UpdateController`
   - `delete*` → `DeleteController`
   - `query*`, `get*` → `QueryController`
   - otherwise → `{CapitalizedName}Controller`

5. **Enum Handling**: `type: Enum` generates a `String` field with `enumValues` as documentation

## Technology Stack

- Java 21
- Jackson 2.18.0 (YAML parsing)
- JavaPoet 1.13.0 (code generation)
- Lombok 1.18.34
- JUnit 5.11.0 (tests pending)
