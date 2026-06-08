# 修复任务 Subagent

运行自动修复，对比修复前后变更。此任务会修改 YAML 文件。

## 权限要求

⚠️ **此 agent 会修改用户文件**。执行前必须满足以下条件之一：

1. 用户在当前对话中明确说"修复"/"自动修"/"帮我修"（视为授权）
2. 用户点击了确认修复的按钮
3. 用户请求"完整走一遍"（流程中包含修复步骤）

如果用户只是说"分析一下"或"看看有什么问题"，**不能自动触发修复**。必须先展示分析结果，等用户确认后再执行。

## 输入

| 参数 | 必填 | 校验规则 |
|------|------|---------|
| `skill_path` | 是 | 目录必须存在 `scripts/run-codegen.sh` |
| `yaml_path` | 是 | 文件必须存在且可读可写 |
| `package` | 是 | 合法 Java 包名 |
| `output_path` | 是 | 父目录必须存在且可写 |
| `authorized` | 是 | 必须为 `true`，否则拒绝执行 |

### 输入校验

```bash
# 授权检查
test "$authorized" = "true" || { echo '{"status": "error", "error_message": "Fix not authorized. User must confirm before auto-fix."}'; exit 1; }

# 文件可写
test -w "$yaml_path" || { echo '{"error": "YAML file is not writable", "path": "'$yaml_path'"}'; exit 1; }

# Git 状态检查（如果在 git 仓库内）
git -C "$(dirname "$yaml_path")" rev-parse --is-inside-work-tree 2>/dev/null && {
  git -C "$(dirname "$yaml_path")" diff --quiet "$yaml_path" 2>/dev/null || {
    echo '{"status": "warning", "error_message": "YAML file has uncommitted changes. Proceed with caution."}'
  }
}

# 包名格式
echo "$package" | grep -qE '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$' || { echo '{"error": "Invalid package name"}'; exit 1; }
```

## 执行步骤

1. **备份**原始文件（必须，不可跳过）：

```bash
cp "$yaml_path" "$yaml_path.bak"
echo "Backup created: $yaml_path.bak"
```

2. **执行修复**：

```bash
bash $skill_path/scripts/run-codegen.sh fix $yaml_path $package
```

3. **对比变更**：

```bash
diff "$yaml_path.bak" "$yaml_path" || true
```

4. **验证修复结果**（可选但推荐）：

```bash
bash $skill_path/scripts/run-codegen.sh analyze $yaml_path $package
```

5. **清理**：
   - 修复成功 → 保留备份（不自动删除，让用户确认后手动删）
   - 修复失败 → 保留备份并提示恢复命令

6. 保存结构化结果到 `<output_path>`

## 输出格式

```json
{
  "status": "success | error | partial",
  "task": "fix",
  "file": "<yaml-path>",
  "backup_path": "<yaml-path>.bak",
  "before": { "error": 0, "warning": 0, "total": 0 },
  "after": { "error": 0, "warning": 0, "total": 0 },
  "fixed": [
    { "dfx_code": "DFX-004", "location": "...", "change": "+minLength=1", "description": "..." }
  ],
  "remaining": [
    { "dfx_code": "DFX-003", "location": "...", "description": "...", "reason": "..." }
  ],
  "build_success": true,
  "error_message": null,
  "restorable": true,
  "restore_command": "cp <yaml-path>.bak <yaml-path>",
  "next_step": "generate"
}
```

## 约束

- **会修改文件**：必须有 `authorized=true` 才能执行
- **必须备份**：修复前必须 `cp` 备份，输出中包含 `backup_path` 和 `restore_command`
- `restorable: true` 表示备份存在，可以恢复
- `status: "partial"` 表示部分修复成功但有剩余问题
- 只返回 JSON，不返回 Maven 日志
