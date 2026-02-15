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

### Maven 插件

```bash
# 添加插件到 pom.xml
mvn com.apicgen:api-codegen-maven-plugin:generate -DyamlFile=api.yaml
```

### Java 直接运行

```bash
java -jar api-codegen-core/target/api-codegen.jar api.yaml
```

## 配置

在 `codegen-config.yaml` 中配置：

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

### 自定义注解

支持为生成的类和方法添加自定义注解：

```yaml
customAnnotations:
  classAnnotations:
    - "@Secured"
    - "@AuditLog"
  methodAnnotations:
    - "@Permission(\"default\")"
```

生成效果：

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
