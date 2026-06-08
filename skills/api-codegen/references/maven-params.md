# Maven 插件参数

## 基础命令

```bash
mvn com.apicgen:api-codegen-maven-plugin:generate [参数]
```

## 参数列表

| 参数 | 默认值 | 说明 |
|------|-------|------|
| `yamlFile` | `${basedir}/src/main/resources/api.yaml` | 输入的 Swagger/OpenAPI YAML 文件路径 |
| `basePackage` | `com.apicgen` | 生成代码的基础包名 |
| `outputDir` | `${basedir}/src/main/java` | 代码输出根目录 |
| `framework` | `spring` | 框架类型：`spring`（Spring MVC）或 `cxf`（JAX-RS） |
| `company` | （空） | 版权声明中的公司名，为空则不加版权头 |
| `force` | `false` | 目标文件已存在时是否先备份再覆盖 |
| `analyze` | `false` | 只分析不生成代码 |
| `autoFix` | `false` | 自动修复 YAML 并回写，不继续生成代码 |
| `openapi` | `false` | 使用 OpenAPI 3.0 模式 |

## 输出子路径

| 类型 | 子路径 | 覆盖策略 |
|------|-------|---------|
| Controller | `generated/api/` | 不覆盖（需手动复制） |
| Request | `src/main/java/req/` | 自动覆盖 |
| Response | `src/main/java/rsp/` | 自动覆盖 |

## 典型命令

```bash
# 最小生成
mvn com.apicgen:api-codegen-maven-plugin:generate \
  -DyamlFile=api.yaml \
  -DbasePackage=com.example.demo

# Spring MVC + 强制覆盖 + 版权
mvn com.apicgen:api-codegen-maven-plugin:generate \
  -DyamlFile=api.yaml \
  -DbasePackage=com.example.demo \
  -Dframework=spring \
  -Dforce=true \
  -Dcompany="MyCompany"

# 只分析
mvn com.apicgen:api-codegen-maven-plugin:generate \
  -DyamlFile=api.yaml \
  -DbasePackage=com.example.demo \
  -Danalyze=true

# 只修复
mvn com.apicgen:api-codegen-maven-plugin:generate \
  -DyamlFile=api.yaml \
  -DbasePackage=com.example.demo \
  -DautoFix=true
```
