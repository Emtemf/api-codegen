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
mvn com.apicgen:api-codegen-maven-plugin:generate

# 或使用短命令（首次需要完整 groupId）
mvn api-codegen:generate
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

| 方式 | 命令 | 状态 | 环境 |
|------|------|------|------|
| Java jar | `java -jar api-codegen.jar api.yaml` | ✅ 通过 | Windows + JDK 21 |
| Maven Wrapper | `.\mvnw.cmd api-codegen:generate` | ✅ 通过 | Windows + JDK 21 |
| Maven 插件 | `mvn api-codegen:generate` | ✅ 通过 | Windows + JDK 21 + Maven |

---

## API 定义示例

创建 `api.yaml` 文件：

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
  -output <目录>              输出目录 (默认: ./generated)
  -package <包名>             基础包名 (默认: com.apicgen)
  -company <公司名>            版权公司名
  -framework <框架>           框架类型: cxf (默认: cxf)
  -force                      强制覆盖已有文件
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

## License

Apache-2.0
