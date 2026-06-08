# 生成任务 Subagent

运行代码生成，收集文件清单和关键代码片段。

## 权限要求

此 agent 会创建新文件。`--output` 目录如果已存在同名文件：

- `--force` 未指定 → 跳过已存在的文件（安全默认行为）
- `--force` 指定 → 先 `.bak` 备份再覆盖

⚠️ 如果输出目录指向用户项目源码目录，**必须确认用户已理解覆盖策略**。建议输出到独立目录（如 `./generated/`），让用户手动复制。

## 输入

| 参数 | 必填 | 校验规则 |
|------|------|---------|
| `skill_path` | 是 | 目录必须存在 `scripts/run-codegen.sh` |
| `yaml_path` | 是 | 文件必须存在且可读 |
| `package` | 是 | 合法 Java 包名 |
| `framework` | 是 | 必须为 `spring` 或 `cxf` |
| `output_dir` | 否 | 默认当前目录 |
| `force` | 否 | `true` 或 `false`，默认 `false` |
| `output_path` | 是 | 父目录必须存在且可写 |
| `auto_fix_if_needed` | 否 | `true` 或 `false`，默认 `true` |

### 输入校验

执行前先运行校验脚本，不通过则中止：

```bash
bash $SKILL_PATH/scripts/validate-input.sh "$yaml_path" "$package" "$output_path"
# 输出 VALIDATION_OK 或 VALIDATION_ERROR: <reason>

# 额外检查框架参数
echo "$framework" | grep -qE '^(spring|cxf)$' || { echo '{"status": "error", "error_message": "Invalid framework: must be spring or cxf"}'; exit 1; }
```

## 执行步骤

1. **尝试生成**：

```bash
bash $skill_path/scripts/run-codegen.sh generate $yaml_path $package --framework=$framework ${output_dir:+--output=$output_dir} ${force:+--force}
```

2. **如果因 DFX 校验失败**（且 `auto_fix_if_needed=true`）：
   - 先执行 fix（参考 `fix.md` 的备份和修复流程）
   - 标记 `auto_fixed_before_generate: true`
   - 重新执行 generate

3. **收集结果**：

```bash
find $output_dir -name "*.java" | sort
```

4. 读取每个 Controller 文件，提取类名和方法签名
5. 读取 Request/Response 文件
6. 保存结构化结果到 `<output_path>`

## 数据依赖

此 agent 可以接收分析 agent 的 JSON 输出作为前置信息：

```json
{
  "input_from": "analyze",
  "analyze_result": { ... }
}
```

如果提供了分析结果，可以据此：
- 判断是否需要先修复（`analyze_result.summary.error > 0`）
- 确定合适的框架参数

## 输出格式

```json
{
  "status": "success | error",
  "task": "generate",
  "file": "<yaml-path>",
  "framework": "spring | cxf",
  "package": "<package>",
  "output_dir": "<output-dir>",
  "file_count": 0,
  "files": [
    {
      "type": "controller | request | response",
      "path": "relative/path/to/File.java",
      "class_name": "XxxController",
      "api_name": "操作名称",
      "methods": [
        { "name": "methodName", "http_method": "GET", "path": "/path" }
      ]
    }
  ],
  "controller_snippets": {
    "XxxController.java": "类定义 + 方法签名代码片段"
  },
  "build_success": true,
  "auto_fixed_before_generate": false,
  "error_message": null,
  "next_step": "none",
  "next_steps": [
    "将 Controller 文件复制到项目源码目录",
    "编写业务逻辑（替换 // TODO 占位符）",
    "Request/Response 后续重新生成会自动更新"
  ]
}
```

## 约束

- `controller_snippets` 只包含类定义和方法签名，不包含完整实现（节省 context）
- 如果 `auto_fixed_before_generate: true`，主 agent 应告知用户 YAML 已被修改
- `--force` 模式下会覆盖文件，输出中应注明
- 只返回 JSON，不返回 Maven 日志
