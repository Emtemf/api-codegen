# API Codegen

基于 YAML 定义自动生成 Java API 代码，支持 CXF (JAX-RS) 框架。

## 环境要求

- **JDK 21** 或更高版本

## 三种使用方式

### 方式一：Java 直接运行（推荐，无需 Maven）

**适合：** 没有 Maven 环境，或内网无法下载依赖

```bash
# 克隆并进入项目目录
git clone https://github.com/Emtemf/api-codegen.git
cd api-codegen

# 构建（需要 JDK 21）
.\mvnw.cmd clean package -DskipTests

# 运行
java -jar api-codegen-core/target/api-codegen.jar api.yaml

# 带参数运行
java -jar api-codegen-core/target/api-codegen.jar api.yaml -output=src/main/java -package=com.example
```

### 方式二：Maven Wrapper（推荐，无需安装 Maven）

**适合：** 有 JDK 21，但不想安装 Maven

```bash
# 克隆并进入项目目录
git clone https://github.com/Emtemf/api-codegen.git
cd api-codegen

# 构建
.\mvnw.cmd clean package -DskipTests

# 运行插件
.\mvnw.cmd api-codegen:generate -DyamlFile=api.yaml
```

### 方式三：Maven 插件（适合项目集成）

**适合：** 在现有 Maven 项目中集成使用

**1. 添加插件到你的 `pom.xml`：**

```xml
<build>
    <plugins>
        <plugin>
            <groupId>com.apicgen</groupId>
            <artifactId>api-codegen-maven-plugin</artifactId>
            <version>1.0.0</version>
            <configuration>
                <yamlFile>${basedir}/src/main/resources/api.yaml</yamlFile>
                <basePackage>com.example.api</basePackage>
            </configuration>
        </plugin>
    </plugins>
</build>
```

**2. 运行生成：**

```bash
# 基本生成
mvn com.apicgen:api-codegen-maven-plugin:generate

# 或使用短命令（首次需要完整 groupId）
mvn api-codegen:generate

# 强制覆盖已有文件
mvn api-codegen:generate -Dforce=true

# 分析校验规则
mvn api-codegen:generate -Danalyze=true

# 自动修复校验规则
mvn api-codegen:generate -DautoFix=true

# 带自定义参数
mvn api-codegen:generate -DyamlFile=src/main/resources/api.yaml -DbasePackage=com.example.api
```

---

## IntelliJ IDEA 中使用

### 在 IDEA 中使用 Maven 插件

**方法 1：使用 Maven 面板**

1. 打开 IDEA，点击右侧 **Maven** 面板
2. 展开 **api-codegen** > **Lifecycle**
3. 双击 **package**（跳过测试可勾选 Skip Tests）

**方法 2：使用 Terminal**

1. 点击底部 **Terminal**
2. 运行：
   ```
   .\mvnw.cmd clean package -DskipTests
   ```

**方法 3：直接运行插件目标**

1. Maven 面板中展开 **api-codegen** > **Plugins** > **api-codegen**
2. 双击 **api-codegen:generate**

或在 Terminal 运行：
```
.\mvnw.cmd api-codegen:generate -DyamlFile=你的api.yaml
```

---

## 验证结果

| 方式 | 命令 | 状态 | 环境 | 备注 |
|------|------|------|------|------|
| Java jar | `java -jar api-codegen.jar api.yaml` | ✅ 通过 | Windows + JDK 21 | 生成 16 个文件 |
| Maven Wrapper | `.\mvnw.cmd api-codegen:generate` | ✅ 通过 | Windows + JDK 21 | 生成 16 个文件 |
| Maven 插件 | `mvn api-codegen:generate` | ✅ 通过 | Windows + JDK 21 + Maven | 生成 16 个文件 |
| analyze 校验分析 | `java -jar api-codegen.jar api.yaml --analyze` | ✅ 通过 | Windows + JDK 21 | 检测 23 个问题 |
| auto-fix 自动修复 | `java -jar api-codegen.jar api.yaml --auto-fix` | ✅ 通过 | Windows + JDK 21 | 修复 23 个问题 |
| Maven analyze | `mvn api-codegen:generate -Danalyze=true` | ✅ 通过 | Windows + JDK 21 | 检测 23 个问题 |
| Maven auto-fix | `mvn api-codegen:generate -DautoFix=true` | ✅ 通过 | Windows + JDK 21 | 修复 23 个问题 |

---

## API 定义示例

创建 `api.yaml` 文件，支持两种格式：

### 格式一：自定义格式（推荐）

```yaml
apis:
  - name: createUser
    path: /api/users
    method: POST
    description: 创建用户
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
          required: true
          description: 用户名
          validation:
            minLength: 4
            maxLength: 20
        - name: email
          type: String
          required: true
          description: 邮箱
          validation:
            email: true
    response:
      className: CreateUserRsp
      fields:
        - name: userId
          type: Long
          description: 用户ID
```

### 格式二：Swagger 2.0 / OpenAPI 3.0（自动转换）

直接导入 Swagger 或 OpenAPI 格式的 YAML：

```yaml
swagger: '2.0'
info:
  version: v1
  title: 用户管理 API
  description: 用户相关的 API 接口
schemes:
  - https
basePath: /api
paths:
  /users:
    get:
      summary: 获取用户列表
      operationId: getUserList
      responses:
        200:
          description: 成功
          schema:
            type: array
            items:
              $ref: '#/definitions/User'
    post:
      summary: 创建用户
      operationId: createUser
      parameters:
        - name: body
          in: body
          required: true
          schema:
            $ref: '#/definitions/CreateUserRequest'
      responses:
        200:
          description: 成功
definitions:
  User:
    type: object
    properties:
      id:
        type: integer
        description: 用户ID
      username:
        type: string
        description: 用户名
```

**提示：** 系统会自动检测 YAML 格式，无需手动指定。

## 输出文件

```
generated/api/          # Controller - 复制到项目，手动编写业务逻辑
src/main/java/req/      # Request - 自动覆盖
src/main/java/rsp/      # Response - 自动覆盖
```

## 命令行参数（方式一）

```bash
java -jar api-codegen.jar <yaml文件> [选项]

选项:
  -output, --outputDir <目录>     输出目录 (默认: ./generated)
  -package, --basePackage <包名>  基础包名 (默认: com.apicgen)
  -company <公司名>               版权公司名
  -framework <框架>              框架类型: cxf (默认: cxf)
  -force                         强制覆盖已有文件
  -analyze, --analyze            分析缺失的校验规则
  -auto-fix, --auto-fix          自动补全缺失的校验规则
  -help, --help                  显示帮助信息
```

## 校验分析功能

### 分析缺失的校验规则

自动检测 YAML 中字段是否缺少校验规则：

```bash
# 分析 YAML 文件中的校验问题
java -jar api-codegen.jar api.yaml --analyze
```

**输出示例：**
```
========================================
Validation Analysis
========================================

Summary:
  Errors:   2
  Warnings: 6
  Info:     0
  Total:    8

Issues:
  [ERROR] CreateUserReq.username (String): 必填字段缺少 @NotNull/@NotBlank 校验
  [ERROR] CreateUserReq.email (String): 必填字段缺少 @NotNull/@NotBlank 校验
  [WARN] CreateUserReq.username (String): String 字段缺少长度校验
  [WARN] CreateUserReq.email (String): String 字段缺少长度校验
  [WARN] CreateUserReq.age (Integer): 数值字段缺少范围校验
  ...
```

### 自动修复校验规则

根据分析结果自动补全校验规则：

```bash
# 自动修复 YAML 文件
java -jar api-codegen.jar api.yaml --auto-fix
```

**自动修复规则：**

| 类型 | 默认规则 |
|------|----------|
| String | `minLength: 1`, `maxLength: 255` |
| Integer/Long | `min: 0`, `max: 2147483647` |
| Double | `min: 0`, `max: 9999999999` |
| List | `minSize: 1`, `maxSize: 100` |
| 邮箱字段 | 自动添加 `email: true` |
| 电话字段 | 自动添加正则 `^1[3-9]\\d{9}$` |
| 生日字段 | 自动添加 `past: true` |
| 预约字段 | 自动添加 `future: true` |

### Maven 插件中使用

```bash
# 分析校验规则
mvn api-codegen:generate -Danalyze=true

# 自动修复校验规则
mvn api-codegen:generate -DautoFix=true
```

## 支持的数据类型

| 类型 | 说明 |
|------|------|
| `String` | 字符串 |
| `Integer` | 整数 |
| `Long` | 长整数 |
| `Double` | 浮点数 |
| `Boolean` | 布尔值 |
| `LocalDate` | 日期 |
| `LocalDateTime` | 日期时间 |
| `List<T>` | 列表 |
| `Enum` | 枚举 |
| `自定义对象` | 嵌套对象 |

## 单元测试

项目包含 **94 个单元测试**，使用 JUnit 5 + BDD 风格：

```bash
# 运行所有测试
mvn test

# 运行特定测试类
mvn test -Dtest=ApiValidatorTest

# 运行测试并查看详细报告
mvn test -Dsurefire.useFile=false
```

### 测试覆盖

| 模块 | 测试类 | 用例数 | 说明 |
|------|--------|--------|------|
| 校验器 | `ApiValidatorTest` | 70+ | DFX 规则、边界值、错误检测 |
| 解析器 | `YamlParserTest` | 10+ | YAML 解析、错误处理 |
| 代码生成 | `CodeGeneratorTest` | 5+ | Controller、Req、Rsp 生成 |
| Maven 插件 | `ApiCodegenMojoTest` | 2 | 插件集成 |
| 工具类 | `CodeGenUtilTest` | 5+ | 工具方法 |
| Main | `MainTest` | 2 | 独立运行入口 |

### 测试风格（BDD）

```java
/**
 * 测试场景：minLength大于maxLength
 * 预期结果：minLength不能大于maxLength，校验失败
 * 实际结果：ValidationResult.isValid()返回false
 */
@Test
@DisplayName("should_fail_when_minLength_greater_than_maxLength")
void shouldFailWhenMinLengthGreaterThanMaxLength() {
    // Given
    String yamlContent = "...";
    ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

    // When
    ValidationResult result = validator.validate(apiDefinition);

    // Then
    assertFalse(result.isValid());
}
```

---

## License

Apache-2.0
