# API CodeGen 需求设计文档

## 一、项目概述

**API 代码生成器** - 根据 YAML 定义自动生成 Java API 代码，减少重复劳动，保障设计与代码一致。

- 当前版本：v1.0.0（CXF 支持）
- Java 版本：21
- 目标框架：CXF（JAX-RS）、Spring MVC（预留）

---

## 二、角色与职责

### 1. SE（需求/设计人员）

| 工作内容 | 说明 |
|---------|------|
| 设计 API | 使用公司线上平台设计 YAML（表单形式） |
| 审批确认 | 开发修改 yaml 后，SE 审批确认 |
| 查看接口 | 通过接口文档了解接口定义 |

**SE 不需要**：
- 接触代码
- 了解 Maven 运行
- 知道校验注解如何实现

**与公司平台的关系**：
- 公司平台：表单设计 YAML，无校验/建议功能
- 本项目：做扩展，增加校验、建议、代码生成
- 目标：保证平台 YAML 和生成代码 100% 一致

---

### 2. 开发人员

| 工作内容 | 说明 |
|---------|------|
| 修改 YAML | 设计有问题时，开发修改 yaml 并给 SE 审批 |
| 生成代码 | 运行 `mvn api-codegen:generate` |
| 编写 Controller | 复制生成的 Controller 到项目，编写业务逻辑 |
| 覆盖 Req/Rsp | 自动覆盖，无需手动修改 |

---

### 3. 测试人员

| 工作内容 | 说明 |
|---------|------|
| 查看接口文档 | 需要可读性好的接口文档（不懂 YAML） |
| 接口测试 | 使用 Postman 或公司测试平台 |

---

## 三、工作流程

### 完整流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              完整流程                                     │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │    SE     │     │  开发    │     │  代码    │     │   测试   │
  └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
       │                │                │                │
       │ 1.表单设计      │                │                │
       ├───────────────>│                │                │
       │                │                │                │
       │                │ 2.开发修改（如需要）              │
       │ <──────────────┤                │                │
       │                │                │                │
       │   3.审批确认    │                │                │
       ├───────────────>│                │                │
       │                │                │                │
       │                │ 4.mvn generate │                │
       │                ├───────────────>│                │
       │                │                │                │
       │                │ 5.复制Controller│               │
       │                │ 6.编写业务逻辑   │               │
       │                │                │                │
       │                │                │ 7.自动覆盖Req/Rsp│
       │                │                │                │
       │                │                │ 8.发布接口      │
       │                │                ├───────────────>│
       │                │                │                │
       │                │                │ 9.查看接口文档  │
       │                │                │ <──────────────┤
       │                │                │                │
       │                │                │ 10.Postman测试 │
       │                │                │ <──────────────┤
```

### 输出策略

| 类型 | 输出路径 | 覆盖策略 | 开发操作 |
|------|---------|---------|---------|
| Controller | `generated/api/` | 不覆盖 | 复制到项目，编写业务逻辑 |
| Request | `src/main/java/req/` | 自动覆盖 | 无需关注 |
| Response | `src/main/java/rsp/` | 自动覆盖 | 无需关注 |

**为什么这样设计**：
- Controller 每次复制，开发会改动它
- Req/Rsp 结构固定，改动 = 设计变更，应该重新生成

---

## 四、核心功能

| 功能 | 描述 |
|------|------|
| YAML 解析 | 支持 API、Request、Response、ClassDefinition、FieldDefinition、ValidationConfig |
| 代码生成 | Controller、Request/Response 类，带完整 JSR-303 校验注解 |
| 校验 | 空值、长度、范围、格式、邮箱、枚举、循环引用检测 |
| 框架扩展 | CodeGenerator 接口，预留 Spring MVC 支持 |
| Maven 插件 | 集成到 Maven 构建流程 |

---

## 三、支持的类型和校验

### 字段类型

| 类型 | Java 类型 |
|------|----------|
| String | `String` |
| Integer/Long/Double | 对应包装类 |
| Boolean | `Boolean` |
| LocalDate | `java.time.LocalDate` |
| LocalDateTime | `java.time.LocalDateTime` |
| List\<T\> | `List<T>` |
| List\<List\<T\>\> | `List<List<T>>` 嵌套列表 |
| Enum | `String`（配合 enumValues） |
| 自定义对象 | 嵌套 fields 定义 |

### 校验规则

| 规则 | 适用类型 | 说明 |
|------|---------|------|
| required | 全部 | 字段是否必填 |
| minLength/maxLength | String | 字符串长度 |
| min/max | Integer/Long/Double | 数值范围 |
| minSize/maxSize | List | 列表长度 |
| email | String | 邮箱格式 |
| pattern | String | 正则表达式 |
| past/future | LocalDate/LocalDateTime | 日期校验 |
| elementValidation | List\<T\> | 元素类型校验 |

### DFX 防御规则（华为公司规范）

| 规则 | 检查 | 严重程度 |
|------|------|---------|
| `maxSize` 必须 > 0 | 校验器 | ❌ 错误 |
| `min` 必须 >= 0 | 校验器 | ⚠️ 警告 |
| `minLength` 不能超过 `maxLength` | 校验器 | ❌ 错误 |
| `minSize` 不能超过 `maxSize` | 校验器 | ❌ 错误 |
| `max` 不能小于 `min` | 校验器 | ❌ 错误 |
| 循环引用检测 | 工具类 | ❌ 错误 |

> DFX（Design For X）规范是华为公司的设计标准，用于保障代码的健壮性和可维护性。

---

## 五、技术栈

```
Java 21
├── Jackson 2.18.0      - YAML 解析
├── JavaPoet 1.13.0     - 代码生成
├── Lombok 1.18.34      - 简化代码
├── JUnit 5.11.0        - 测试（当前无测试）
└── Maven 3.x           - 构建工具
```

---

## 六、当前版本规划（v1.0.x）

### 聚焦范围

| 功能 | 状态 | 说明 |
|------|------|------|
| CXF 代码生成 | 开发中 | JAX-RS 风格 Controller + Req/Rsp |
| Spring 代码生成 | 待开发 | v2.0.x |
| Maven 插件 | ✅ | 基础功能完成 |
| 单元测试 | 待补充 | 保护核心逻辑 |
| IDEA 插件 | 待开发 | 未来规划 |
| 浏览器插件 | 待开发 | 未来规划，与公司平台集成 |
| 测试用例生成 | 待开发 | 未来规划 |
| Postman 导出 | 待开发 | 未来规划 |
| CodeReview | 待开发 | 未来规划 |

### 本版本目标

1. **核心功能可用**：
   - YAML 解析 ✅
   - 校验器（DFX 规范）✅
   - CXF 代码生成 ⚠️ 有 bug 待修复
   - Maven 插件 ✅

2. **可运行、可测试**：
   - 修复已知 bug
   - 补充单元测试
   - 验证完整流程

---

## 七、目录结构

```
D:\idea\workSpace\api-codegen\
├── pom.xml                                    # 父 POM（Java 21）
├── codegen-config.yaml                        # 默认配置
├── api-example.yaml                           # 示例 YAML
├── project-requirements.md                    # 本文档
├── CLAUDE.md                                  # Claude Code 指南
│
├── api-codegen-core/                         # 核心库
│   └── src/main/java/com/apicgen/
│       ├── model/                            # 数据模型
│       │   ├── ApiDefinition.java            # API 根节点
│       │   ├── Api.java                      # 单个 API 定义
│       │   ├── ClassDefinition.java          # Request/Response 类定义
│       │   ├── FieldDefinition.java          # 字段定义
│       │   ├── ValidationConfig.java         # 校验规则
│       │   └── ElementValidationConfig.java  # List 元素校验
│       ├── parser/
│       │   └── YamlParser.java               # YAML 解析器
│       ├── validator/
│       │   ├── ApiValidator.java             # API 校验器
│       │   ├── ValidationResult.java         # 校验结果
│       │   └── ValidationError.java          # 校验错误
│       ├── generator/
│       │   ├── CodeGenerator.java            # 生成器接口
│       │   ├── CodeGeneratorFactory.java     # 生成器工厂
│       │   ├── cxf/CxfCodeGenerator.java     # CXF 实现
│       │   └── spring/SpringCodeGenerator.java # Spring 实现（预留）
│       ├── config/
│       │   └── CodegenConfig.java            # 配置类
│       └── util/
│           └── CodeGenUtil.java              # 工具类
│
└── api-codegen-maven-plugin/                 # Maven 插件
    └── src/main/java/com/apicgen/maven/
        └── ApiCodegenMojo.java               # Maven 插件入口
```

---

## 六、配置说明

### Maven 插件参数

| 参数 | 默认值 | 说明 |
|------|-------|------|
| yamlFile | `${basedir}/src/main/resources/api.yaml` | YAML 文件路径 |
| outputDir | `${basedir}/src/main/java` | 输出目录 |
| basePackage | `com.apicgen` | 基础包名 |
| framework | `cxf` | 框架类型 |
| force | `false` | 是否强制覆盖 |
| configFile | `${basedir}/codegen-config.yaml` | 配置文件路径 |

### codegen-config.yaml

```yaml
framework:
  type: cxf

copyright:
  company: ""              # Company name (empty to omit from copyright header)
  startYear: 2024

openapi:
  enabled: false

output:
  controller:
    path: generated/api/
  request:
    path: src/main/java/req/
  response:
    path: src/main/java/rsp/
```

### 输出策略

- **Controller**: `generated/api/` - 手动复制到项目
- **Request/Response**: `src/main/java/req/`, `src/main/java/rsp/` - 自动覆盖

---

## 七、使用方式

```bash
# 构建项目
mvn clean install

# Maven 插件生成
mvn api-codegen:generate
mvn api-codegen:generate -Dforce=true

# 独立运行
java -cp api-codegen-core/target/api-codegen-core-1.0.0.jar com.apicgen.Main api-example.yaml
```

---

## 八、测试策略

### 测试分层

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          测试分层架构                                     │
└─────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
  │ 单元测试 Skill    │ -> │ Postman Skill    │ -> │ 集成测试 Skill   │
  │ (开发阶段)        │    │ (测试阶段)        │    │ (进阶，可选)      │
  └──────────────────┘    └──────────────────┘    └──────────────────┘
          ↓                       ↓                       ↓
     test/*.java          postman.json           integration-test/*.java
```

### 各测试类型对比

| 类型 | Skill | 输出 | 目的 | 使用者 | 执行时机 |
|------|-------|------|------|--------|---------|
| 单元测试 | UnitTest | `test/**/*.java` | 保护校验逻辑 | 开发 | `mvn test` |
| Postman | PostmanExport | `postman-collection.json` | 接口连通性 | 测试 | 平台导入 |
| 集成测试 | IntegrationTest | `integration-test/**/*.java` | 端到端验证 | 开发/测试 | CI |

### 单元测试 Skill

**输入**：`api-design.yaml` + generated 代码

**输出示例**：

```java
// test/java/com/apicgen/req/CreateUserReqTest.java
class CreateUserReqTest {

    private final Validator validator =
        Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("username 不能为空")
    void testUsernameRequired() {
        CreateUserReq req = new CreateUserReq();
        Set<ConstraintViolation<CreateUserReq>> violations = validator.validate(req);
        assertTrue(violations.stream()
            .anyMatch(v -> v.getPropertyPath().toString().equals("username")));
    }

    @Test
    @DisplayName("username 长度必须在 4-20 之间")
    void testUsernameLength() {
        CreateUserReq req = new CreateUserReq();
        req.setUsername("ab"); // 长度不足
        Set<ConstraintViolation<CreateUserReq>> violations = validator.validate(req);
        assertFalse(violations.isEmpty());
    }
}
```

### 接口文档生成 Skill（v1.1.x）

**输入**：`api-design.yaml`

**输出**：`docs/api.md`（Markdown 格式）

**文档格式示例**：

```markdown
# API 接口文档

## 创建用户

### 基本信息

| 项目 | 说明 |
|------|------|
| 接口名称 | createUser |
| 请求路径 | /api/users |
| 请求方法 | POST |
| 描述 | 创建用户 |

### 请求参数

| 字段名 | 类型 | 必填 | 描述 | 校验规则 |
|--------|------|------|------|---------|
| username | String | 是 | 用户名 | 长度 4-20，支持字母数字下划线 |
| age | Integer | 是 | 年龄 | 范围 18-100 |
| email | String | 否 | 邮箱 | 邮箱格式 |

### 请求示例

```json
{
  "username": "test_user",
  "age": 25
}
```

### 响应参数

| 字段名 | 类型 | 描述 |
|--------|------|------|
| userId | Long | 用户 ID |
| username | String | 用户名 |
```

### Mock 数据生成 Skill（v1.1.x）

**输入**：`api-design.yaml`

**输出**：`docs/mock-data.json`

**目的**：为测试提供快速构造请求数据的参考（合法/非法示例）

```json
{
  "createUser": {
    "description": "创建用户接口的 Mock 数据示例",
    "valid": {
      "username": "test_user_123",
      "age": 25,
      "email": "test@example.com",
      "tags": ["vip", "new"],
      "role": "ADMIN"
    },
    "invalid": {
      "username_too_short": "abc",
      "username_too_long": "abcdefghijklmnopqrstuvwxyz",
      "invalid_email": "not-an-email"
    }
  }
}
```

**说明**：
- `valid`：合法数据，测试接口正常流程
- `invalid`：非法数据，测试接口校验逻辑

> **注意**：边界值测试（如 min=18 的 17/18/19 测试）由测试人员根据文档自行编写，不属于代码生成器职责。

### Postman Collection Skill（v1.1.x）

**输入**：`api-design.yaml`

**输出**：`docs/postman-collection.json`

```json
{
  "info": {
    "name": "API Test Collection",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "createUser",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "url": "{{baseUrl}}/api/users",
        "body": {
          "mode": "raw",
          "raw": "{\"username\":\"test\",\"age\":25}"
        }
      },
      "response": []
    }
  ]
}
```

### CodeReview Skill

**规则类型**：

| 分类 | 规则 | 可配置 |
|------|------|--------|
| **固定规则** | 类名规范、包结构、注解使用 | 否 |
| **可配置规则** | 字段命名风格、版权信息、注释要求 | 是 |

**输出**：`review.md`

```markdown
# Code Review 报告

## 总体评价
通过 / 有问题

## 发现的问题
| 级别 | 文件 | 问题 | 建议 |
|------|------|------|------|
| ERROR | CreateUserReq.java | 缺少类注释 | 添加 @see 引用 |
| WARN | CreateController.java | 方法命名不规范 | 建议使用驼峰 |

## 建议
...
```

---

## 九、未来扩展：Claude Skills 流水线

### 完整流水线设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Claude Code 自动化流水线                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ 需求扩展      │ -> │ API 设计     │ -> │ 项目初始化   │ -> │ API 代码生成  │
  │ Skill        │    │ Skill        │    │ Skill        │    │ Skill        │
  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
        ↓                   ↓                   ↓                   ↓
   requirement.md      api-design.yaml     project/            generated/
                                                                - Controller
                                                                - Req/Rsp

  ┌──────────────┐    ┌──────────────┐
  │ 测试用例      │ -> │ CodeReview   │
  │ Skill        │    │ Skill        │
  └──────────────┘    └──────────────┘
        ↓                   ↓
   test/*.java        review.md
```

### Skill 说明

| Skill | 输入 | 输出 | 说明 |
|-------|------|------|------|
| 需求扩展 | 原始需求 | `requirement.md` | 完善需求文档，补充用户故事、验收标准 |
| API 设计 | `requirement.md` | `api-design.yaml` | 根据需求生成 API YAML 定义 |
| 项目初始化 | `api-design.yaml` | `project/` | 初始化 Maven 项目结构 |
| API 代码生成 | `api-design.yaml` | `generated/` | 生成 Controller、Req、Rsp |
| 测试用例 | `api-design.yaml` + `generated/` | `test/*.java` | 生成接口验证测试用例 |
| CodeReview | `generated/` | `review.md` | 代码审查，发现问题可迭代 |

### 数据流转

```
原始需求 -> requirement.md (需求扩展)
    |
    v
api-design.yaml (API 设计)  <-- 迭代反馈
    |
    +--> project/ (项目初始化)
    |
    +--> generated/ (API 代码生成)
    |
    +--> test/ (测试用例) --> review.md (CodeReview)
    |                             |
    +-----------------------------+
            迭代修复
```

### 迭代机制

CodeReview 发现问题后：
1. 问题在 API 设计 → 回退到 "API 设计" 重新生成
2. 问题在代码实现 → 直接修复生成的代码
3. 问题在需求 → 回退到 "需求扩展"

---

## 九、下一步工作

### 短期（v1.0.x）

- [x] YAML 解析和校验
- [x] CXF 代码生成
- [x] Maven 插件集成
- [ ] 补充单元测试
- [ ] 完善错误提示

### 中期（v2.0.x）

- [ ] Spring MVC 支持
- [ ] OpenAPI 注解支持
- [ ] 浏览器插件（SE 可视化编辑）

### 长期（Claude Skills 流水线）

| Skill | 优先级 | 说明 |
|-------|--------|------|
| 需求扩展 | 低 | 完善需求文档 |
| API 设计 | 中 | 需求 → yaml（依赖公司平台） |
| 项目初始化 | 低 | Maven 项目结构 |
| API 代码生成 | ✅ 已完成 | 当前版本核心 |
| 单元测试 | 中 | 生成 JUnit 5 测试用例 |
| Postman 导出 | 中 | 生成接口文档 + Postman Collection |
| 集成测试 | 低 | 生成 RestAssured 测试 |
| CodeReview | 低 | 代码审查 + 修复建议 |

### 迭代路线图

```
v1.0.x（当前）                    v1.1.x                    v2.0.x
┌─────────────────┐              ┌─────────────────┐       ┌─────────────────┐
│ 核心功能可用     │              │ 完善功能         │       │ 扩展支持         │
├─────────────────┤              ├─────────────────┤       ├─────────────────┤
│ ✅ YAML解析      │   ──────>    │ ✅ 单元测试      │  ──>  │ ✅ Spring 支持   │
│ ✅ 校验器        │              │ ✅ 错误提示优化   │       │ ✅ OpenAPI 注解  │
│ ⚠️ CXF生成(修bug)│              │ ✅ 接口文档生成   │       │                 │
│ ✅ Maven插件     │              │ ✅ Postman导出   │       │                 │
│ ❌ 单元测试      │              │                 │       │                 │
└─────────────────┘              └─────────────────┘       └─────────────────┘
                                      │
                                      v
                              ┌─────────────────┐
                              │ Claude Skills   │
                              ├─────────────────┤
                              │ 需求扩展 Skill  │
                              │ API设计 Skill   │
                              │ 测试用例 Skill  │
                              │ CodeReview Skill│
                              └─────────────────┘
```

**说明**：
- v1.0.x：聚焦核心功能，修复 bug，能运行
- v1.1.x：完善配套功能，接口文档、Postman
- v2.0.x：扩展支持，Spring、OpenAPI
- Claude Skills：独立演进，按需开发

---

## 九、注意事项

1. **Controller 类名规则**：API 名前缀决定类型
   - `create*` → `CreateController`
   - `update*` → `UpdateController`
   - `delete*` → `DeleteController`
   - `query*`/`get*` → `QueryController`
   - 其他 → `{CapitalizedName}Controller`

2. **Enum 类型**：实际生成 `String` 字段，`enumValues` 仅作文档参考

3. **循环引用检测**：防止无限嵌套的字段定义

4. **备份机制**：使用 `-Dforce=true` 时，旧文件会备份为 `.bak`

5. **DFX 规范**：严格遵守华为公司 DFX 设计规范

---

## 十一、公司平台集成（未来规划）

### 现状

| 平台 | 功能 | 限制 |
|------|------|------|
| 公司线上平台 | 表单设计 YAML | 无校验、无法建议 |
| 本项目 | 校验 + 代码生成 | 独立运行 |

### 目标

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   公司平台       │ ──> │   本项目        │ ──> │   生成代码      │
│  (表单设计 YAML) │     │  (校验+建议)    │     │  (100%一致)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              ↑
                         DFX 规范检查
                         命名规范检查
                         完整性检查
```

### 集成方式（待定）

1. **平台导出 YAML** → 本项目处理
2. **平台调用本项目 API**（如开发 MCP Server）
3. **IDE 插件**直接读取平台数据

---

## 十二、参考资源

### 测试框架参考

| 框架 | 用途 | 参考 |
|------|------|------|
| JUnit 5 | 单元测试 | https://junit.org/junit5/ |
| RestAssured | API 集成测试 | https://rest-assured.io/ |
| Hibernate Validator | JSR-303 实现 | https://hibernate.org/validator/ |

### Postman 参考

- **Collection 格式**：https://schema.getpostman.com/json/collection/v2.1.0/
- **环境变量**：https://learning.postman.com/docs/environment-variables/environment-variables/

### Claude Code 参考

- **官方文档**：https://docs.claude.com/
- **MCP（Model Context Protocol）**：用于扩展 Claude 能力
- **Skills 开发**：通过 `Skill` 工具封装可复用逻辑

### 代码规范参考

| 规范 | 来源 |
|------|------|
| Java 编码规范 | 华为公司规范 / Google Java Style Guide |
| RESTful API 设计 | OpenAPI 3.0 规范 |
| API 文档规范 | OpenAPI Specification |

---

## 十三、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0.0 | 2024 | 初始版本，CXF 支持 |
| v1.0.1 | - | 修复代码生成 bug，补充单元测试（本次） |
| v1.1.0 | - | 完善接口文档、Postman 导出 |
| v2.0.0 | - | Spring 支持、OpenAPI 注解 |
