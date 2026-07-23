# Loop Engine - 自动化 Issue 修复循环引擎

> 自动读取 issue → 自动修复 → 自动解答 → 自动修改代码 → 自动提交的完整闭环

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Loop Engine                           │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐            │
│  │ 读取输入  │──▶│ 分析问题  │──▶│ 自动修复  │            │
│  └──────────┘   └──────────┘   └──────────┘            │
│       ▲              │              │                   │
│       │              ▼              ▼                   │
│       │         ┌──────────┐   ┌──────────┐            │
│       │         │ 生成解答  │   │ 修改代码  │            │
│       │         └──────────┘   └──────────┘            │
│       │                             │                   │
│       │         ┌──────────┐        ▼                   │
│       └─────────│ 循环判断  │   ┌──────────┐            │
│                 └──────────┘   │ 提交推送  │            │
│                                └──────────┘            │
│                                      │                   │
│                              ┌───────┴────────┐        │
│                              ▼                ▼        │
│                        ┌──────────┐   ┌──────────┐    │
│                        │ GitHub   │   │ 通知系统  │    │
│                        │ 回复/关闭│   │Webhook   │    │
│                        └──────────┘   └──────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 使用方式

### 基本用法

```bash
# 使用默认示例 YAML
python3 scripts/loop_engine.py

# 指定 YAML 文件
python3 scripts/loop_engine.py --yaml my-api.yaml

# 干跑模式（不实际修改文件、不提交）
python3 scripts/loop_engine.py --dry-run
```

### GitHub 集成

```bash
# 设置 GitHub Token
export GITHUB_TOKEN=your_token_here

# 从 GitHub issues 自动读取 YAML 并处理
python3 scripts/loop_engine.py --github

# 处理完成后自动在 issue 上评论 + 关闭
```

### 高级功能

```bash
# 断点续传（从上次中断的地方继续）
python3 scripts/loop_engine.py --resume

# 限制最大迭代次数
python3 scripts/loop_engine.py --max-iterations 3

# 查看当前状态
python3 scripts/loop_engine.py --status

# Webhook 通知
python3 scripts/loop_engine.py --notify-webhook https://hooks.example.com/loop

# Slack 通知
LOOP_SLACK_WEBHOOK=https://hooks.slack.com/... python3 scripts/loop_engine.py
```

## 核心组件

| 组件 | 职责 | 文件位置 |
|------|------|----------|
| **LoopEngine** | 主循环逻辑 | `scripts/loop_engine.py` |
| **GitHubIntegration** | GitHub API 集成 | `scripts/loop_engine.py` |
| **StatePersistence** | 状态持久化 | `scripts/loop_engine.py` |
| **NotificationSystem** | Webhook/Slack 通知 | `scripts/loop_engine.py` |
| **WebUIStatusAPI** | Web UI 状态同步 | `scripts/loop_engine.py` |
| **Loop Agent** | Claude Code agent | `.claude/agents/loop-agent.md` |
| **Loop Skill** | Claude Code skill | `.claude/skills/loop-engine/SKILL.md` |
| **Server API** | Web UI 状态端点 | `web-ui/server.js` |

## 数据流

### 1. 输入来源

- **本地文件**: `--yaml path/to/file.yaml`
- **GitHub Issue**: `--github` (从 issue body 提取 YAML 代码块或 URL)
- **默认示例**: `api-example.yaml`

### 2. 分析循环

```
Loop:
  1. POST /api/analyze → 获取 issues
  2. 分类: fixable vs manual
  3. 对 fixable: POST /api/fix → 获取修复后 YAML
  4. 写入修复后 YAML
  5. 重新分析，直到无 fixable issues 或达到最大迭代
```

### 3. 输出

- **修复后 YAML**: `target/loop-engine-output/fixed_iter*.yaml`
- **日志**: `target/loop-engine-output/loop_engine.log`
- **状态**: `.omc/state/loop-engine/state.json`
- **Git 提交**: 自动 commit + push
- **GitHub 回复**: 自动评论 + 关闭 issue
- **Web UI**: 实时状态显示
- **Webhook/Slack**: 完成通知

## GitHub 集成

### Issue 格式

Loop Engine 会从 GitHub issue body 中提取 YAML：

```markdown
## API 定义

请修复以下 YAML 中的校验问题：

\`\`\`yaml
swagger: "2.0"
paths:
  //users:
    get:
      operationId: getUsers
\`\`\`
```

或直接提供 YAML URL：

```
请检查 https://example.com/api.yaml
```

### 自动回复

处理完成后，Loop Engine 会在 issue 上添加评论：

```markdown
## 🤖 Loop Engine 自动处理结果

**处理时间**: 2026-07-23 17:02:35

### 处理详情
- ✅ 自动修复: 27 项
- ⚠️ 需手动处理: 3 项

### ✅ 已自动修复
- ✅ **已自动修复**: 路径包含重复斜杠
- ✅ **已自动修复**: 必填字段缺少 @NotNull/@NotBlank 校验
...

### 📦 提交
Commit: `a1b2c3d4`
```

如果全部修复，会自动关闭 issue。

## Web UI 集成

Loop Engine 通过 `/api/loop-engine/status` 端点与 Web UI 同步状态：

- **GET**: 获取当前状态
- **POST**: 更新状态

Web UI 底部状态栏会显示 Loop Engine 实时状态：

```
🔄 Loop | ✅ completed (iter 1) · 修复 27
```

## 配置

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `GITHUB_TOKEN` | (无) | GitHub API token |
| `PORT` | 19090 | Web UI server 端口 |
| `LOOP_WEBHOOK_URL` | (无) | Webhook 通知 URL |
| `LOOP_SLACK_WEBHOOK` | (无) | Slack webhook URL |
| `LOOP_MAX_ITERATIONS` | 5 | 最大迭代次数 |
| `LOOP_DRY_RUN` | false | 干跑模式 |

### 文件路径

| 路径 | 说明 |
|------|------|
| `scripts/loop_engine.py` | 主引擎 |
| `.claude/agents/loop-agent.md` | Agent 定义 |
| `.claude/skills/loop-engine/SKILL.md` | Skill 定义 |
| `target/loop-engine-output/` | 输出目录 |
| `.omc/state/loop-engine/` | 状态目录 |

## 扩展点

Loop Engine 设计为可扩展：

1. **新的输入源**: 继承 `read_input()` 添加新来源
2. **新的修复规则**: 扩展 `apply_fix()` 方法
3. **新的通知渠道**: 扩展 `NotificationSystem` 类
4. **新的分析后端**: 替换 `call_core_analyze/fix` 函数
5. **并行处理**: 扩展 `run()` 支持多文件并行

## Claude Code 集成

### Agent 调用

```
使用 loop-agent 来自动处理 issues
```

### Skill 调用

```
/loop-engine
/loop-engine --yaml my-api.yaml
/loop-engine --dry-run
```

### 完整自动化

```
启动 loop engine，自动从 GitHub 读取 issues 并修复
```
