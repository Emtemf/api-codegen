## 修复报告

**文件**：`{{file}}`

### 修复概览

| 指标 | 修复前 | 修复后 |
|------|-------|-------|
| 总问题数 | {{before.total}} | {{after.total}} |
| ❌ 错误 | {{before.error}} | {{after.error}} |
| ⚠️ 警告 | {{before.warning}} | {{after.warning}} |

### 已修复（{{fixed_count}} 项）

| # | DFX 规则 | 变更 | 说明 |
|---|---------|------|------|
{{#each fixed}}
| {{@index}} | {{dfx_code}} | {{location}} {{change}} | {{description}} |
{{/each}}

### 剩余问题（{{remaining_count}} 项，需手动处理）

| # | DFX 规则 | 位置 | 原因 |
|---|---------|------|------|
{{#each remaining}}
| {{@index}} | {{dfx_code}} | {{location}} | {{reason}} |
{{/each}}

### 下一步

可继续生成代码：
`bash scripts/run-codegen.sh generate {{file}} <package>`
