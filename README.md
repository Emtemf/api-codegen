# API Codegen

基于 YAML 定义自动生成 Java API 代码，支持 CXF (JAX-RS) 框架。

## 特性

- 支持 **Swagger 2.0** 和 **OpenAPI 3.0** YAML 格式
- 自动校验分析和修复建议（DFX 规则代码）
- 生成 Controller、Request、Response 类
- 支持类和方法级别自定义注解
- Web UI 可视化编辑，支持实时预览和 Diff 对比

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

> 注意：如果图片未正常显示，请尝试强制刷新浏览器 (Ctrl+F5)

**Swagger 2.0 示例** - 自动分析校验规则
![Swagger Demo](docs/images/01-swagger-demo.png)

**OpenAPI 3.0 示例**
![OpenAPI Demo](docs/images/02-openapi-demo.png)

**路径错误自动修复**
![Path Error](docs/images/03-path-error-analysis.png)

**自动修复预览对比**
![Auto-fix Preview](docs/images/04-autofix-preview.png)

### Maven 插件

```bash
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
    path: src/main/java/rsp/  # Response 类出目录

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

| 场景 | 规则 | DFX代码 |
|------|------|---------|
| String 字段缺少长度校验 | minLength: 1, maxLength: 255 | DFX-004 |
| 必填字段缺少 @NotNull | required=true | DFX-003 |
| String 必填使用 @NotBlank | required=true 且 type=String | DFX-003 |
| 邮箱字段缺少格式校验 | format: email | DFX-005 |
| 电话字段缺少正则校验 | 包含 phone/mobile | DFX-006 |
| 数值字段缺少范围 | Integer/Long/Double | DFX-007 |
| List 字段缺少大小 | minSize: 1, maxSize: 100 | DFX-008 |
| page/pageNum 分页参数 | min: 1, max: 2147483647 | DFX-011 |
| pageSize/limit/size | min: 1, max: 100 | DFX-012 |
| 路径参数（数值） | min: 1 | DFX-014 |
| 路径参数（字符串） | minLength: 1 | DFX-014 |

### 支持的参数类型

代码生成支持以下参数类型注解：

| 参数位置 | 注解 | 说明 |
|----------|------|------|
| 路径参数 | `@PathParam` | URL 路径中的参数 |
| 查询参数 | `@QueryParam` | URL 查询字符串参数 |
| 请求头 | `@HeaderParam` | HTTP 请求头参数 |
| Cookie | `@CookieParam` | Cookie 参数 |
| 请求体 | `@RequestBody` | JSON 请求体 |

生成的 Controller 方法示例：

```java
@GET
@Path("/users/{id}")
@Produces(MediaType.APPLICATION_JSON)
public Response getUserById(
    @NotNull @Min(1) @PathParam("id") Integer id,
    @NotBlank @Size(min=1, max=255) @HeaderParam("X-Token") String xToken,
    @Size(min=1, max=64) @CookieParam("JSESSIONID") String jsessionid) {
    // TODO: 实现业务逻辑
    return null;
}
```

## 示例文件

- `swagger2-example.yaml` - Swagger 2.0 示例
- `openapi3-example.yaml` - OpenAPI 3.0 示例
- `web-ui/demo-swagger.html` - Web UI Swagger 示例
- `web-ui/demo-openapi.html` - Web UI OpenAPI 示例

## 环境要求

- JDK 21 或更高版本

## 测试

```bash
mvn test
```

## License

Apache-2.0
