# API Codegen

基于 YAML 定义自动生成 Java API 代码，支持 CXF (JAX-RS) 框架。

## 快速开始

### 第一步：安装依赖

```bash
# 确保安装了 Java 21 和 Maven 3.6+
java -version
mvn -version
```

### 第二步：克隆并构建

```bash
git clone https://github.com/Emtemf/api-codegen.git
cd api-codegen
mvn clean install -DskipTests
```

### 第三步：在你的项目中使用

**1. 添加插件到你的 `pom.xml`：**

```xml
<build>
    <plugins>
        <plugin>
            <groupId>com.apicgen</groupId>
            <artifactId>api-codegen-maven-plugin</artifactId>
            <version>1.0.0</version>
            <configuration>
                <!-- API 定义文件 -->
                <yamlFile>${basedir}/src/main/resources/api.yaml</yamlFile>
                <!-- 输出目录 -->
                <outputDir>${basedir}/src/main/java</outputDir>
                <!-- 基础包名 -->
                <basePackage>com.example.api</basePackage>
            </configuration>
        </plugin>
    </plugins>
</build>
```

**2. 创建 API 定义文件** `src/main/resources/api.yaml`：

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
        - name: success
          type: Boolean
          description: 是否成功
```

**3. 运行生成命令：**

```bash
# 首次生成（或需要更新时）
mvn api-codegen:generate

# 强制覆盖已有文件
mvn api-codegen:generate -Dforce=true
```

### 第四步：查看生成的文件

```
generated/api/com/example/api/controller/CreateController.java  # 复制到项目
src/main/java/com/example/req/CreateUserReq.java              # 自动覆盖
src/main/java/com/example/rsp/CreateUserRsp.java              # 自动覆盖
```

**重要：** Controller 文件不会自动覆盖，你需要手动复制到你的项目并编写业务逻辑。

---

## 工作流程图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        你的项目                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   1. 编辑 api.yaml 定义 API                                           │
│          ↓                                                           │
│   2. 运行 mvn api-codegen:generate                                   │
│          ↓                                                           │
│   3. 生成文件                                                        │
│      ┌─────────────────┬─────────────────┬─────────────────┐        │
│      │  Controller     │  Request        │  Response       │        │
│      │  (手动复制)     │  (自动覆盖)      │  (自动覆盖)      │        │
│      └─────────────────┴─────────────────┴─────────────────┘        │
│          ↓                                                           │
│   4. 复制 Controller 到项目，编写业务逻辑                              │
│          ↓                                                           │
│   5. 当 API 变更时，重复步骤 2-4                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 配置文件

在项目根目录创建 `codegen-config.yaml`：

```yaml
framework: CXF

copyright:
  company: ""              # 公司名（为空不显示）
  startYear: 2024

openApi:
  enabled: false

output:
  controller:
    path: generated/api/        # Controller 路径（手动复制）
  request:
    path: src/main/java/req/   # Request 路径（自动覆盖）
  response:
    path: src/main/java/rsp/   # Response 路径（自动覆盖）
```

---

## YAML 完整示例

```yaml
apis:
  # 创建用户 API
  - name: createUser
    path: /api/users
    method: POST
    description: 创建新用户
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
            pattern: "^[a-zA-Z0-9_]+$"
        - name: password
          type: String
          required: true
          description: 密码
          validation:
            minLength: 6
            maxLength: 32
        - name: email
          type: String
          required: true
          description: 邮箱
          validation:
            email: true
        - name: age
          type: Integer
          required: false
          description: 年龄
          validation:
            min: 0
            max: 150
        - name: tags
          type: List<String>
          required: false
          description: 用户标签
          validation:
            minSize: 0
            maxSize: 10
    response:
      className: CreateUserRsp
      fields:
        - name: userId
          type: Long
          description: 创建的用户ID
        - name: success
          type: Boolean
          description: 是否成功
        - name: message
          type: String
          description: 返回消息

  # 查询用户 API
  - name: queryUser
    path: /api/users/{userId}
    method: GET
    description: 查询用户信息
    request:
      className: QueryUserReq
      fields:
        - name: userId
          type: Long
          required: true
          description: 用户ID
          validation:
            min: 1
    response:
      className: QueryUserRsp
      fields:
        - name: userId
          type: Long
        - name: username
          type: String
        - name: email
          type: String
        - name: createdAt
          type: LocalDateTime
```

---

## 支持的数据类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `String` | 字符串 | 用户名、邮箱 |
| `Integer` | 整数 | 年龄、数量 |
| `Long` | 长整数 | ID、计数器 |
| `Double` | 浮点数 | 价格、评分 |
| `Boolean` | 布尔值 | 状态开关 |
| `LocalDate` | 日期 | 生日、到期日 |
| `LocalDateTime` | 日期时间 | 创建时间 |
| `List<T>` | 列表 | 标签数组 |
| `Enum` | 枚举 | 状态枚举 |
| `自定义对象` | 嵌套对象 | 用户地址 |

---

## 校验规则

### 字符串 (String)

| 规则 | 说明 | 示例 |
|------|------|------|
| `required: true` | 必填 | - |
| `minLength` | 最小长度 | `minLength: 4` |
| `maxLength` | 最大长度 | `maxLength: 20` |
| `pattern` | 正则表达式 | `pattern: "^[a-zA-Z0-9_]+$"` |
| `email` | 邮箱格式 | `email: true` |

### 数字 (Integer/Long/Double)

| 规则 | 说明 | 示例 |
|------|------|------|
| `required: true` | 必填 | - |
| `min` | 最小值 | `min: 0` |
| `max` | 最大值 | `max: 100` |

### 日期 (LocalDate/LocalDateTime)

| 规则 | 说明 | 示例 |
|------|------|------|
| `past` | 必须是过去时间 | `past: true` |
| `future` | 必须是未来时间 | `future: true` |

### 列表 (List<T>)

| 规则 | 说明 | 示例 |
|------|------|------|
| `minSize` | 最少元素数 | `minSize: 1` |
| `maxSize` | 最多元素数 | `maxSize: 100` |

---

## 生成代码示例

### Controller

```java
@Path("/api/users")
public class CreateController {

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public CreateUserRsp create(@Valid CreateUserReq req) {
        // TODO: 实现业务逻辑
        return null;
    }
}
```

### Request

```java
@Data
public class CreateUserReq {

    @NotNull
    @Size(min = 4, max = 20)
    @Pattern(regexp = "^[a-zA-Z0-9_]+$")
    private String username;

    @NotNull
    @Email
    private String email;

    @Min(0)
    @Max(150)
    private Integer age;
}
```

### Response

```java
@Data
public class CreateUserRsp {
    private Long userId;
    private Boolean success;
    private String message;
}
```

---

## 命令行参数

```bash
mvn api-codegen:generate \
    -DyamlFile=src/main/resources/api.yaml \
    -DoutputDir=src/main/java \
    -DbasePackage=com.example.api \
    -Dcompany="MyCompany" \
    -Dforce=true
```

| 参数 | 说明 | 默认值 |
|------|------|-------|
| `yamlFile` | YAML 文件路径 | `${basedir}/src/main/resources/api.yaml` |
| `outputDir` | 输出基准目录 | `${basedir}/src/main/java` |
| `basePackage` | 基础包名 | `com.apicgen` |
| `framework` | 框架类型 | `cxf` |
| `company` | 公司名（版权） | `""` |
| `force` | 强制覆盖 | `false` |

---

## 项目结构

```
api-codegen/
├── api-codegen-core/              # 核心库
│   ├── src/main/java/com/apicgen/
│   │   ├── model/               # 数据模型
│   │   ├── config/               # 配置类
│   │   ├── parser/              # YAML 解析器
│   │   ├── validator/            # 校验器
│   │   ├── generator/            # 代码生成器
│   │   │   ├── cxf/             # CXF 实现
│   │   │   └── spring/          # Spring 实现（预留）
│   │   └── util/                 # 工具类
│   └── src/test/                 # 测试
├── api-codegen-maven-plugin/     # Maven 插件
│   └── src/main/java/com/apicgen/
│       └── maven/                # Mojo 实现
├── codegen-config.yaml           # 配置文件示例
└── api-example.yaml             # YAML 示例文件
```

---

## 开发

### 构建项目

```bash
mvn clean install
```

### 运行测试

```bash
mvn test
```

### 本地运行

```bash
java -cp api-codegen-core/target/api-codegen-core-1.0.0.jar com.apicgen.Main api-example.yaml
```

---

## 常见问题

**Q: Controller 文件被覆盖了怎么办？**

A: Controller 不会自动覆盖。如果使用了 `-Dforce=true`，旧文件会备份为 `.bak`。

**Q: 如何修改输出路径？**

A: 编辑 `codegen-config.yaml` 或使用命令行参数。

**Q: 支持 Spring MVC 吗？**

A: 当前支持 CXF，Spring MVC 正在规划中。

---

## License

Apache-2.0 License
