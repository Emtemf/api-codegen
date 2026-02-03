# 配置摘要 - 配置预览与验证

## 当前配置 (codegen-config.yaml)

```yaml
framework:
  type: cxf

copyright:
  company: ""              # 为空时不显示公司名
  startYear: 2024

openapi:
  enabled: false
  version: "3.0"

output:
  controller:
    path: generated/api/      # 开发手动复制
  request:
    path: src/main/java/req/  # 自动覆盖
  response:
    path: src/main/java/rsp/  # 自动覆盖
```

## 配置项说明

### 框架类型 (framework.type)

| 值 | 说明 | 状态 |
|---|------|------|
| cxf | CXF/JAX-RS 风格 | ✅ 已实现 |
| spring | Spring MVC 风格 | ⚠️ 预留 (v2.0.x) |

### 输出路径 (output.*.path)

| 类型 | 路径 | 覆盖策略 | 说明 |
|------|------|---------|------|
| controller | `generated/api/` | 不覆盖 | Controller 需要手动复制到项目 |
| request | `src/main/java/req/` | 自动覆盖 | Request 类结构固定 |
| response | `src/main/java/rsp/` | 自动覆盖 | Response 类结构固定 |

### 路径格式要求

1. **相对路径**: 相对于项目根目录 (`${basedir}`)
2. **结尾斜杠**: 路径以 `/` 结尾
3. **包结构**: 实际路径 = `output.path` + `basePackage` 替换 `.` 为 `/`

### 自定义配置示例

```yaml
# 企业级配置示例
framework:
  type: cxf

copyright:
  company: "MyCompany"
  startYear: 2024

output:
  controller:
    path: src/main/java/com/mycompany/api/controller/
  request:
    path: src/main/java/com/mycompany/dto/request/
  response:
    path: src/main/java/com/mycompany/dto/response/
```

## Maven 插件参数

| 参数 | 默认值 | 说明 |
|------|-------|------|
| yamlFile | `${basedir}/src/main/resources/api.yaml` | YAML 文件路径 |
| outputDir | `${basedir}/src/main/java` | 输出基准目录 |
| basePackage | `com.apicgen` | 基础包名 |
| framework | `cxf` | 框架类型 |
| force | `false` | 是否强制覆盖 |
| configFile | `${basedir}/codegen-config.yaml` | 配置文件路径 |
| company | `""` | 公司名称 |
| startYear | 当前年份 | 版权年份 |
| openapi | `false` | 是否启用 OpenAPI 注解 |

## 运行时配置预览

```
========================================
API 代码生成器 v1.0.0
========================================
加载配置文件: D:\project\codegen-config.yaml
框架类型: CXF
OpenAPI 注解: false
基础包名: com.apicgen
Controller 输出: generated/api/
Request 输出: src/main/java/req/
Response 输出: src/main/java/rsp/
解析到 5 个 API
YAML 校验通过
生成 API: createUser
生成文件: D:\project\generated\api\com\apicgen\api\CreateController.java
...
========================================
代码生成完成！
========================================
```

## 配置验证清单

- [x] YAML 文件存在且可解析
- [x] 框架类型有效 (cxf/spring)
- [x] 输出路径格式正确
- [x] 包名符合 Java 规范
- [x] 版权配置完整（company/startYear）
- [x] API 定义校验通过

## 常见问题

### Q: 如何修改输出路径？

A: 编辑 `codegen-config.yaml` 或使用 Maven 参数：

```bash
mvn api-codegen:generate -DoutputDir=custom/path
```

### Q: Controller 为什么不覆盖？

A: 设计决策 - Controller 需要手动复制并编写业务逻辑，覆盖会导致代码丢失。

### Q: 如何查看当前配置？

A: 运行 Maven 插件时会打印当前配置，或查看生成的 `CONFIG_SUMMARY.md`。

### Q: 可以为不同项目使用不同配置吗？

A: 可以，每个项目可以有自己的 `codegen-config.yaml`。
