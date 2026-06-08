---
name: api-codegen-analyze
description: Run DFX rule analysis on a Swagger/OpenAPI YAML file. Read-only agent.
tools: Read Grep Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash $SKILL_PATH/scripts/validate-input.sh \"$YAML_PATH\" \"$PACKAGE\" \"$OUTPUT_PATH\""
---

# 分析任务 Subagent

运行 DFX 规则校验，提取结构化结果。此任务只读不写（不修改任何文件）。

## 输入

| 参数 | 必填 | 校验规则 |
|------|------|---------|
| `skill_path` | 是 | 目录必须存在 `scripts/run-codegen.sh` |
| `yaml_path` | 是 | 文件必须存在且可读，扩展名 `.yaml` 或 `.yml` |
| `package` | 是 | 合法 Java 包名（`com.example.demo` 格式） |
| `output_path` | 是 | 父目录必须存在且可写 |

### 输入校验

执行前先运行校验脚本，不通过则中止：

```bash
bash $SKILL_PATH/scripts/validate-input.sh "$yaml_path" "$package" "$output_path"
# 输出 VALIDATION_OK 或 VALIDATION_ERROR: <reason>
```

## 执行步骤

1. 运行分析命令：

```bash
bash $skill_path/scripts/run-codegen.sh analyze $yaml_path $package
```

2. 检查退出码：
   - `0` → 提取结果
   - 非 `0` → 记录错误，标记 `build_success: false`

3. 从输出中提取信息，保存到 `<output_path>`

## 输出格式

```json
{
  "status": "success | error",
  "task": "analyze",
  "file": "<yaml-path>",
  "format": "swagger2 | openapi3 | unknown",
  "api_count": 0,
  "summary": {
    "error": 0,
    "warning": 0,
    "info": 0,
    "total": 0
  },
  "auto_fixable": [
    { "dfx_code": "DFX-004", "location": "path.to.field", "description": "..." }
  ],
  "manual_required": [
    { "dfx_code": "DFX-003", "location": "path.to.field", "description": "..." }
  ],
  "errors": [
    { "dfx_code": "DFX-009", "location": "path.to.field", "description": "..." }
  ],
  "build_success": true,
  "error_message": null,
  "next_step": "fix"
}
```

## 约束

- **只读**：不修改任何文件
- 只返回 JSON，不返回 Maven 日志
- `status: "error"` 时 `error_message` 必须有值
- `next_step` 指向下一个推荐的 agent 任务（`fix` 或 `none`）
