# API Codegen

基于 YAML 定义自动生成 Java API 代码，支持 CXF (JAX-RS) 框架。

## 特性

- 支持 **Swagger 2.0** 和 **OpenAPI 3.0** YAML 格式
- 自动校验分析和修复建议
- 生成 Controller、Request、Response 类
- 支持类和方法级别自定义注解
- Web UI 可视化编辑

## 支持的 YAML 格式

| 格式 | 说明 |
|------|------|
| **Swagger 2.0** | 行业标准格式 |
| **OpenAPI 3.0** | 最新行业标准格式 |

系统会自动检测 YAML 格式，无需手动指定。

## 快速开始

### Web UI（推荐）

```bash
cd web-ui
npx serve -l 8080
# 浏览器打开 http://localhost:8080
```

或直接用浏览器打开 `web-ui/index.html`

### Web UI 界面预览

**Swagger 2.0 示例**
![Swagger Demo](docs/images/01-swagger-demo.png)

**OpenAPI 3.0 示例**
![OpenAPI Demo](docs/images/02-openapi-demo.png)

**路径错误自动修复**
![Path Error](docs/images/03-path-error-analysis.png)

**自动修复预览对比**
![Auto-fix Preview](docs/images/04-autofix-preview.png)

### Maven 插件

```bash
# 添加插件到 pom.xml
mvn com.apicgen:api-codegen-maven-plugin:generate -DyamlFile=api.yaml
```

### Java 直接运行

```bash
java -jar api-codegen-core/target/api-codegen.jar api.yaml
```

## 配置文件

在项目根目录创建 `codegen-config.yaml`：

```yaml
# 框架类型: cxf（支持 cxf）
framework:
  type: cxf

# 版权声明（直接塞到文件顶部）
copyright: "Copyright (c) 2024 MyCompany. All rights reserved."

# 输出路径配置
output:
  controller:
    path: generated/api/    # Controller 输出目录
  request:
    path: src/main/java/req/  # Request 输出目录
  response:
    path: src/main/java/rsp/  # Response 输出目录

# 自定义注解（可选）
customAnnotations:
  classAnnotations:
    - "@Secured"
    - "@AuditLog"
  methodAnnotations:
    - "@Permission(\"default\")"
```

### 配置说明

| 配置项 | 说明 |
|--------|------|
| `framework.type` | 框架类型，目前仅支持 `cxf` |
| `copyright` | 版权声明，直接放到文件顶部，为空则不添加 |
| `output.controller.path` | 生成的 Controller 类输出路径 |
| `output.request.path` | 生成的 Request 类输出路径 |
| `output.response.path` | 生成的 Response 类输出路径 |
| `customAnnotations` | 可选，自定义注解配置 |

### 自定义注解示例

支持为生成的类和方法添加自定义注解：

```java
@Path("/api")
@Secured
@AuditLog
public class ExampleApi {

    @Permission("default")
    @POST
    @Path("/users")
    public CreateUserRsp create(@Valid CreateUserReq req) {
        // ...
    }
}
```

## 命令行参数

```bash
java -jar api-codegen.jar <yaml文件> [选项]

选项:
  -output <目录>     输出目录 (默认: ./generated)
  -package <包名>    基础包名 (默认: com.apicgen)
  -company <公司名>  版权公司名
  -force             强制覆盖已有文件
  -analyze           分析缺失的校验规则
  -auto-fix          自动补全缺失的校验规则
```

## 校验规则

系统会自动检测字段并添加校验规则：

| 字段类型 | 自动添加的校验 |
|----------|----------------|
| String | minLength: 1, maxLength: 255 |
| Integer/Long | min: 0, max: 2147483647 |
| 邮箱字段 | email: true |
| 电话字段 | pattern: ^(\\+86\|86)?1[3-9]\\d{9}$ |
| required 参数 | @NotNull |
| page/pageNum | min: 1, max: 2147483647 |
| pageSize/limit/size | min: 1, max: 100 |
| 路径参数（数值） | min: 1 |
| 路径参数（字符串） | minLength: 1 |

## 示例文件

- `swagger2-example.yaml` - Swagger 2.0 示例
- `openapi3-example.yaml` - OpenAPI 3.0 示例

## 环境要求

- JDK 21 或更高版本

## 测试

```bash
mvn test
```

## License

Apache-2.0
