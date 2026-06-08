## DFX 分析报告

**文件**：`{{file}}`
**格式**：{{format}}
**API 数量**：{{api_count}} 个接口

### 概览

| 严重程度 | 数量 |
|---------|------|
| ❌ 错误（报错） | {{summary.error}} |
| ⚠️ 警告（可自动修复） | {{summary.warning}} |
| ℹ️ 信息（需手动确认） | {{summary.info}} |
| **合计** | **{{summary.total}}** |

### 可自动修复（{{auto_fixable_count}} 项）

| # | DFX 规则 | 位置 | 说明 |
|---|---------|------|------|
{{#each auto_fixable}}
| {{@index}} | {{dfx_code}} | {{location}} | {{description}} |
{{/each}}

### 需手动确认（{{manual_required_count}} 项）

| # | DFX 规则 | 位置 | 说明 |
|---|---------|------|------|
{{#each manual_required}}
| {{@index}} | {{dfx_code}} | {{location}} | {{description}} |
{{/each}}

### 报错（{{errors_count}} 项）

| # | DFX 规则 | 位置 | 说明 |
|---|---------|------|------|
{{#each errors}}
| {{@index}} | {{dfx_code}} | {{location}} | {{description}} |
{{/each}}

### 下一步

运行修复命令可自动处理 {{auto_fixable_count}} 项警告：
`bash scripts/run-codegen.sh fix {{file}} <package>`
