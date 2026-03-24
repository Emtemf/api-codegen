# API Codegen

基于 YAML 定义自动生成 Java API 代码，同时支持 Spring MVC 和 JAX-RS (CXF) 注解。

## 特性

- 支持 **Swagger 2.0** 和 **OpenAPI 3.0** YAML 格式
- 同时生成 Spring MVC 和 JAX-RS (CXF) 注解
- 自动校验分析和修复建议（DFX 规则代码）
- 生成 Controller、Request、Response 类
- 支持类和方法级别自定义注解
- Web UI 仅负责可视化编辑，分析与修复逻辑统一收敛到 `api-codegen-core`
- 自动修复直接回写用户原始 Swagger / OpenAPI YAML，并提供 Monaco 双栏 Diff 预览
- Maven 插件支持，适配 CI/CD 流程

## 项目结构

```
api-codegen/
├── api-codegen-core/           # 核心代码生成库
├── api-codegen-maven-plugin/  # Maven 插件
└── web-ui/                    # Web 可视化界面
```

## Bridge Contract

Web UI、IDEA 插件、浏览器插件共用的 JSON bridge contract 见：
[`docs/ui-bridge-contract.md`](docs/ui-bridge-contract.md)

## 环境要求

- **JDK 21** 或更高版本（必需）

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
node server.js
# 浏览器打开 http://localhost:18080
# 如果 18080 被占用，会自动顺延到下一个可用端口
# 也可以手动指定端口：PORT=19090 node server.js
```

Web UI 必须通过本地 `server.js` 调用 `api-codegen-core` 作为统一分析/修复入口，
不能直接双击打开 `web-ui/index.html`。

### Web UI 界面预览

> 注意：如果图片未正常显示，请尝试强制刷新浏览器 (Ctrl+F5)

**1. 初始状态** - Core-first workspace，等待输入原始 YAML
![Initial State](docs/images/05-initial-state.png)

**2. Swagger 2.0 示例已加载** - 左侧只编辑用户原始 YAML
![Swagger Loaded](docs/images/05-swagger-loaded.png)

**3. Swagger 分析结果** - 右侧验证面板优先展示当前可自动修复项
![Validation Results](docs/images/06-validation-results.png)

**4. 自动修复预览** - Monaco 双栏对比原始 YAML 与修复后 YAML
![Diff Preview](docs/images/04-autofix-preview.png)

**5. 自动修复后的手动处理组** - 同字段关联问题归并为一个补全入口
![Manual Group](docs/images/07-manual-grouped.png)

**6. OpenAPI 3.0 分析结果** - 与 Swagger 共用同一套 core 分析/修复能力
![OpenAPI Analyze](docs/images/10-openapi-analyze.png)

### Web UI 与 Core 的关系

| Web UI 操作 | 实际执行 |
|------------|----------|
| 打开 / 粘贴 YAML | 编辑用户原始 Swagger / OpenAPI 文件 |
| 点击“分析” | 调用 `api-codegen-core` 的统一分析入口 |
| 点击“自动修复” | 由 `api-codegen-core` 计算可安全回写的修复 |
| 查看修复预览 | 对比原始 YAML 与修复后的 YAML |
| 点击“应用修复” | 将修复结果写回编辑器并重新分析 |
| 点击“需手动” | 在缺少类型语义时补全必要信息，再重新分析 |

### IntelliJ 插件（可选）

项目还提供独立的 IntelliJ IDEA 插件，可在 IDE 中直接使用。

**注意**：IntelliJ 插件位于独立仓库：`https://github.com/Emtemf/api-codegen-intellij-standalone`

### Maven 插件

```bash
mvn com.apicgen:api-codegen-maven-plugin:generate -DyamlFile=api.yaml
```

### Java 直接运行

```bash
# 先构建项目（使用 Maven Wrapper，无需安装 Maven）
./mvnw clean install -DskipTests

# 或使用本地 Maven
mvn clean install -DskipTests

# 使用 Maven 执行插件运行
cd api-codegen-core
../mvnw exec:java -Dexec.mainClass="com.apicgen.Main" -Dexec.args="api.yaml"
```

## 单文件输入与自定义注解

用户只维护一份 API YAML。
如果需要给生成的 Controller 类或方法附加自定义注解，直接写在 Swagger / OpenAPI 文件里，不需要再维护第二份 `codegen-config.yaml`。

如果仓库里还能看到 `codegen-config.yaml`，那只是历史样例/兼容遗留，不是当前推荐输入，也不是 Web UI、Maven 插件或后续 IDEA / 浏览器插件的必需文件。

```yaml
openapi: 3.0.1
paths:
  /users:
    x-java-class-annotations:
      - "@Secured"
      - "@AuditLog"
    post:
      operationId: createUser
      x-java-method-annotations:
        - "@Permission(\"user.create\")"
      responses:
        "200":
          description: OK
```

> 代码生成器同时支持 Spring MVC 和 JAX-RS (CXF) 注解，无需额外配置。

## Maven 插件参数

```bash
mvn com.apicgen:api-codegen-maven-plugin:generate [参数]

常用参数:
  -DyamlFile=api.yaml        # YAML 文件路径
  -DbasePackage=com.example   # 基础包名
  -Dcompany="MyCompany"      # 公司名称
  -Dforce=true               # 强制覆盖已有文件
```

## 校验规则

系统会自动检测字段并添加校验规则：

### 路径规范

| 场景 | 规则 | DFX代码 |
|------|------|---------|
| 路径包含 `//` | 删除重复斜杠 | DFX-001 |
| 路径不以 `/` 开头 | 自动添加前缀 | DFX-002 |

### 参数校验

| 场景 | 规则 | DFX代码 |
|------|------|---------|
| 必填字段缺少 @NotNull | required=true | DFX-003 |
| String 必填使用 @NotBlank | required=true 且 type=String | DFX-003 |
| page/pageNum 分页参数 | min: 1, max: 2147483647 | DFX-011 |
| pageSize/limit/size | min: 1, max: 100 | DFX-012 |
| 路径参数（数值） | min: 1 | DFX-014 |
| 路径参数（字符串） | minLength: 1 | DFX-014 |

### 字段校验

| 场景 | 规则 | DFX代码 |
|------|------|---------|
| String 字段缺少长度校验 | minLength: 1, maxLength: 255 | DFX-004 |
| 邮箱字段缺少格式校验 | format: email | DFX-005 |
| 电话字段缺少正则校验 | 包含 phone/mobile | DFX-006 |
| 数值字段缺少范围 | Integer/Long/Double | DFX-007 |
| List 字段缺少大小 | minSize: 1, maxSize: 100 | DFX-008 |

### 校验规则

| 场景 | 规则 | DFX代码 |
|------|------|---------|
| minLength 超过 maxLength | 报错 | DFX-009 |
| min 超过 max | 报错 | DFX-010 |
| minSize 超过 maxSize | 报错 | DFX-011 |

### 接口规范

| 场景 | 规则 | DFX代码 |
|------|------|---------|
| 缺少 operationId | 自动生成 | DFX-012 |
| 缺少成功响应 2xx | 警告 | DFX-013 |
| 缺少 API 名称 | 报错 | DFX-015 |
| 缺少 API 路径 | 报错 | DFX-016 |
| 缺少 HTTP 方法 | 报错 | DFX-017 |

### YAML 语法

| 场景 | 规则 | DFX代码 |
|------|------|---------|
| 重复的键 | 报错 | DFX-018 |
| YAML 格式错误 | 报错 | DFX-019 |

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

## 测试

```bash
./mvnw test

# 仅运行 core 相关测试
./mvnw -pl api-codegen-core test

# Web UI bridge / diff / render 回归
cd web-ui && npm run test:ci

# Web UI E2E（Playwright）
cd web-ui && npm run test:e2e
```

### 测试要求

**核心原则：`api-codegen-core` 为单一业务来源**

所有分析、修复、格式收敛逻辑都必须在 `api-codegen-core` 实现。Web UI、IDEA 插件、浏览器插件和 Maven 插件只做交互、集成与展示。

**BDD 格式**：所有测试使用 Given-When-Then 结构，确保可读性。

**覆盖率要求**：
- 所有场景覆盖（每个 DFX 规则都有测试）
- 所有分支覆盖（if/else 都要覆盖 true/false）
- 边界条件覆盖（min/max 边界值）
- 正向+反向测试（合法和非法输入）

**重要**：不根据参数名推断类型，保留用户原始定义。

### 端到端测试场景

```bash
# Web UI bridge / diff / render 回归
cd web-ui && npm test

# E2E 测试
cd web-ui && npm run test:e2e
```

**测试覆盖的 DFX 规则**：

| DFX 规则 | 测试场景 |
|----------|---------|
| **路径规范** |
| DFX-001 | 路径包含 `//` → 自动删除重复斜杠 |
| DFX-002 | 路径不以 `/` 开头 → 自动添加前缀 |
| **参数校验** |
| DFX-003 | 必填参数缺少 `@NotNull` → 自动添加 |
| DFX-011 | page 参数缺少范围 → 自动添加 `min:1, max:2147483647` |
| DFX-012 | pageSize 参数缺少范围 → 自动添加 `min:1, max:100` |
| DFX-014 | 路径参数缺少校验 → 自动添加 `min:1` 或 `minLength:1` |
| **字段校验** |
| DFX-004 | String 字段缺少长度校验 → 自动添加 `@Size` |
| DFX-005 | email 字段缺少格式校验 → 自动添加 `@Email` |
| DFX-006 | phone 字段缺少正则校验 → 自动添加 pattern |
| DFX-007 | 数值字段缺少范围校验 → 自动添加 `@Min`/`@Max` |
| DFX-008 | List 字段缺少大小校验 → 自动添加 `@Size` |

**架构分层**：

```
┌─────────────────────────────────────┐
│ Web UI / IDEA 插件 / 浏览器插件      │
└──────────────┬──────────────────────┘
               │ bridge contract / 调用
┌──────────────▼──────────────────────┐
│       api-codegen-core (核心库)      │ ← 校验 / 修复 / 转换 / 生成
└──────────────┬──────────────────────┘
               │ 集成
┌──────────────▼──────────────────────┐
│      Maven 插件 / CLI / 其他宿主      │
└─────────────────────────────────────┘
```

## License

Apache-2.0
