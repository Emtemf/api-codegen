## 代码生成报告

**文件**：`{{file}}`
**框架**：{{framework}}
**包名**：`{{package}}`
**输出目录**：`{{output_dir}}`

### 生成文件

| 类型 | 文件路径 | 说明 |
|------|---------|------|
{{#each files}}
| {{type}} | `{{path}}` | {{api_name}} |
{{/each}}

**共 {{file_count}} 个文件**

### Controller 摘要

{{#each controller_snippets}}
**`{{@key}}`**
```java
{{this}}
```

{{/each}}

### 下一步

1. 将 Controller 文件复制到项目源码目录
2. 编写业务逻辑（替换 `// TODO` 占位符）
3. Request/Response 文件可直接引用，后续重新生成会自动更新
