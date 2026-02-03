# 测试输出目录说明

本目录包含单元测试生成的文件和文档，用于验证代码生成器的功能和配置。

## 目录结构

```
src/test/output/
├── web-ui/                    # Web 可视化界面
│   └── index.html            # 直接在浏览器中打开查看
├── valid-all-types/          # 测试所有数据类型
│   └── API_DOCUMENTATION.md  # API 文档
├── valid-edge-cases/         # 测试边界条件
│   └── API_DOCUMENTATION.md  # API 文档
└── config-preview/           # 配置预览
    └── CONFIG_SUMMARY.md     # 配置摘要
```

## Web 可视化界面

打开 `web-ui/index.html` 文件即可在浏览器中查看：

```bash
# macOS
open ../../../../web-ui/index.html

# Windows
start ../../../../web-ui/index.html

# 或直接在浏览器中打开文件
```

### 功能特性

| 功能 | 说明 |
|------|------|
| API 列表 | 左侧展示所有 API，点击选择查看详情 |
| API 详情 | 中间展示请求/响应字段、校验规则 |
| 代码预览 | 右侧实时展示生成的 Controller/Request/Response 代码 |
| 统计信息 | 显示字段数量、HTTP 方法等统计 |

![Web UI Preview]

## valid-all-types - 所有数据类型测试

**文件**: `src/test/resources/yaml/valid-all-types.yaml`

**用途**: 验证所有支持的数据类型和校验规则

| 数据类型 | 状态 | 说明 |
|---------|------|------|
| String | ✅ | 基本字符串类型 |
| Integer/Long/Double | ✅ | 数值类型 |
| Boolean | ✅ | 布尔类型 |
| LocalDate | ✅ | 日期类型 |
| LocalDateTime | ✅ | 日期时间类型 |
| List\<T\> | ✅ | 列表类型 |
| List\<List\<T\>\> | ⚠️ | 嵌套列表（未测试） |
| Enum | ✅ | 枚举类型 |
| 自定义对象 | ✅ | 嵌套对象 |

| 校验规则 | 状态 | 说明 |
|---------|------|------|
| required | ✅ | 必填字段 |
| minLength/maxLength | ✅ | 字符串长度 |
| min/max | ✅ | 数值范围 |
| minSize/maxSize | ✅ | 列表长度 |
| email | ✅ | 邮箱格式 |
| pattern | ✅ | 正则表达式 |
| past/future | ✅ | 日期校验 |
| elementValidation | ✅ | 元素校验 |

---

## valid-edge-cases - 边界条件测试

**文件**: `src/test/resources/yaml/valid-edge-cases.yaml`

**用途**: 验证边界条件处理

| 测试场景 | 预期行为 |
|---------|---------|
| min = max | ✅ 允许（单值范围） |
| min = 0 | ✅ 允许（数值可为0） |
| minSize = 0 | ✅ 允许（空列表） |
| 嵌套对象 | ✅ 正确生成嵌套类 |
| 深度嵌套 | ⚠️ 需要进一步测试 |

---

## DFX 防御性规则测试

**文件**: `src/test/resources/yaml/invalid-dfx-errors.yaml`

**用途**: 验证 DFX 规则检测

| 规则 | 错误类型 | 说明 |
|------|---------|------|
| maxSize <= 0 | ERROR | 列表最大元素数必须大于0 |
| min < 0 | WARNING | 数值最小值建议 >= 0 |
| minLength > maxLength | ERROR | 字符串长度范围无效 |
| minSize > maxSize | ERROR | 列表大小范围无效 |
| max < min | ERROR | 数值范围无效 |
| 循环引用 | ERROR | 禁止无限嵌套 |

---

## 配置路径验证

### 默认配置

```yaml
output:
  controller:
    path: generated/api/      # 手动复制，不覆盖
  request:
    path: src/main/java/req/  # 自动覆盖
  response:
    path: src/main/java/rsp/  # 自动覆盖
```

### 自定义配置示例

```yaml
output:
  controller:
    path: src/main/java/com/example/api/controller/
  request:
    path: src/main/java/com/example/dto/request/
  response:
    path: src/main/java/com/example/dto/response/
```

---

## 使用方式

### 运行代码生成

```bash
# 使用默认配置
mvn api-codegen:generate

# 强制覆盖
mvn api-codegen:generate -Dforce=true

# 指定配置文件
mvn api-codegen:generate -DconfigFile=custom-config.yaml
```

### 查看生成的文件

生成的文件位于配置的输出路径：

- Controller: `generated/api/{basePackage}/api/`
- Request: `{outputDir}/{basePackage}/req/`
- Response: `{outputDir}/{basePackage}/rsp/`

---

## 注意事项

1. **Controller 文件不覆盖**: 开发需要手动复制 Controller 到项目，编写业务逻辑
2. **Req/Rsp 自动覆盖**: API 设计变更时直接重新生成
3. **备份机制**: 使用 `-Dforce=true` 时，旧文件会备份为 `.bak`
4. **包名规范**: 生成的类使用配置的 `basePackage`
