---
name: api-codegen
description: |
  Swagger/OpenAPI YAML 到 Java API 代码的完整工作流：DFX 规则校验分析、自动修复、Controller/Request/Response 代码生成、修复预览。
  当用户提到 Swagger、OpenAPI、YAML 校验、API 代码生成、Controller 生成、DFX 规则、接口校验、API YAML 修复、生成 Java 接口代码、给接口加注解、x-java-annotations、需要创建 API 定义、想从零开始定义接口时，都应触发此 skill。
  即使用户只说"帮我看看这个 YAML 有没有问题"或"根据这个 YAML 生成代码"或"帮我给某个接口加个注解"或"我想定义一套接口但还没有 YAML 文件"，也应触发。
---

# API Codegen Skill

从一份 Swagger 2.0 / OpenAPI 3.0 YAML 出发，完成校验分析 → 自动修复 → Java 代码生成 → 预览的完整闭环。

## 工作流总览

```
环境检测 ─→ 依赖准备（如需）
  │
  ▼
YAML 文件
  │
  ├─① 分析 ─→ DFX 规则校验，输出问题列表
  │
  ├─② 修复 ─→ 自动修复可修复项，回写 YAML
  │
  ├─③ 生成 ─→ Controller + Request + Response Java 代码
  │
  └─④ 预览 ─→ 展示修复 diff 或生成代码
```

用户可以从任意步骤开始，也可以走完整流程。根据用户意图选择对应步骤。

## 打包资源

```
api-codegen/
├── SKILL.md                          # 本文件
├── agents/                           # Subagent 定义（YAML + 详细指令）
│   ├── analyze.yaml                  # 分析任务（只读，tools: Read/Grep/Bash）
│   ├── analyze.md                    # 分析任务详细指令
│   ├── fix.yaml                      # 修复任务（需授权，tools: Read/Grep/Bash/Write）
│   ├── fix.md                        # 修复任务详细指令
│   ├── generate.yaml                 # 生成任务（tools: Read/Grep/Bash/Write）
│   └── generate.md                   # 生成任务详细指令
├── scripts/                          # 可执行脚本
│   ├── check-env.sh                  # 环境检测（一键检查所有依赖）
│   ├── run-codegen.sh                # Maven 插件包装（简化调用）
│   ├── validate-input.sh             # 输入校验（文件存在、包名格式）
│   └── validate-writable.sh          # 修复授权校验（authorized + 可写 + git 状态）
├── references/                       # 参考文档（按需加载）
│   ├── dfx-rules.md                  # DFX 规则速查
│   └── maven-params.md              # Maven 插件参数
└── assets/
    ├── templates/                    # 输出格式模板（按需加载）
    │   ├── analyze-report.md         # 分析报告模板
    │   ├── fix-report.md             # 修复报告模板
    │   └── generate-report.md        # 生成报告模板
    ├── swagger2-template.yaml        # Swagger 2.0 最小模板
    └── openapi3-template.yaml        # OpenAPI 3.0 最小模板
```

### 加载策略

- `agents/`：仅在执行对应任务时读取，传给 subagent 作为指令
- `assets/templates/`：仅在需要格式化输出时读取，用 subagent 返回的 JSON 数据填充模板
- `references/`：仅在需要详细规则或参数信息时读取
- `scripts/`：直接执行，不需要读取内容

## 跨平台适配

所有命令以 Linux/macOS 为默认写法。在 Windows 上执行时做以下替换：
- `./mvnw` → `mvnw.cmd`
- `bash scripts/check-env.sh` → 用 PowerShell 等效命令执行
- Maven 参数中的文件路径始终使用 `/`（Maven 内部会处理）

脚本内部已通过 `uname -s` 自动检测 OS。

## 环境检测与准备

每次触发此 skill 时，**先运行环境检测脚本**，再进入工作流。

### 一键检测

```bash
bash scripts/check-env.sh [CODEGEN_HOME]
```

输出 key=value 格式，关键字段：

| 字段 | 含义 | 异常处理 |
|------|------|---------|
| `jdk` | JDK 状态 | `missing`/`wrong_version` → 提示安装 JDK 21+ |
| `codegen_home` | 项目定位 | `not_found` → 询问用户路径 |
| `plugin` | 插件安装状态 | `not_installed` → subagent 执行 `./mvnw clean install -DskipTests` |
| `source_stale` | 源码是否比插件新 | `true` → 提醒重新构建 |
| `node` | Node.js 状态 | `missing`（需 Web UI 时）→ 提示安装 |
| `webui_deps` | 前端依赖 | `missing` → `npm install` |

### 快速运行命令

```bash
bash scripts/run-codegen.sh analyze <yaml> <package>
bash scripts/run-codegen.sh fix <yaml> <package>
bash scripts/run-codegen.sh generate <yaml> <package> [--framework=spring|cxf] [--output=<dir>] [--force] [--company="Name"]
bash scripts/run-codegen.sh webui [--port=18080]
```

## Subagent 执行模式

Maven 输出通常几百行日志，直接在主上下文执行会消耗 context window。**所有 Maven 操作必须通过 subagent 执行**。

| 操作 | 执行方式 |
|------|---------|
| 环境检测（`check-env.sh`） | 主上下文（输出短） |
| 构建安装 | **subagent**（日志长） |
| 分析 / 修复 / 生成 | **subagent**（日志长） |
| 读取生成文件、格式化展示 | 主上下文 |
| Web UI 启动 | 主上下文（后台运行） |

### Subagent 调用流程

每个工作流步骤的执行流程：

1. 读取对应的 `agents/<task>.md`，作为 subagent 的指令
2. 用 `Agent` 工具启动 subagent，传入具体参数（yaml 路径、包名等）
3. Subagent 执行 Maven 命令，提取结构化 JSON 结果，保存到文件
4. 主上下文读取 subagent 的 JSON 结果
5. 读取对应的 `assets/templates/<task>-report.md` 模板
6. 用 JSON 数据填充模板，展示给用户

### Subagent 指令文件

- [`agents/analyze.md`](agents/analyze.md) — 分析任务：执行 `run-codegen.sh analyze`，提取 DFX 规则命中结果为 JSON
- [`agents/fix.md`](agents/fix.md) — 修复任务：备份→执行 `run-codegen.sh fix`→diff 对比，返回修复前后对比 JSON
- [`agents/generate.md`](agents/generate.md) — 生成任务：执行 `run-codegen.sh generate`，收集文件清单和代码片段 JSON

每个 subagent 指令文件包含：输入参数（含校验规则）、执行步骤、JSON 输出格式、约束条件。

### 数据流协议

Agent 之间通过 JSON 文件传递数据。每个 agent 的输出都是下一个 agent 可选的输入。

```
用户请求
  │
  ▼
check-env.sh ──→ 主上下文读取环境状态
  │
  ▼
┌─────────────────────────────────────────────────────┐
│  analyze agent                                       │
│  输入：yaml_path, package                             │
│  输出：analyze.json（summary + 各 DFX 规则命中列表）   │
│  权限：只读，无需确认                                  │
└──────────────┬──────────────────────────────────────┘
               │ analyze.json
               ▼
         主上下文展示报告
         用户确认"修复"？
               │ 是
               ▼
┌─────────────────────────────────────────────────────┐
│  fix agent                                           │
│  输入：yaml_path, package, authorized=true            │
│  输出：fix.json（before/after 对比 + 变更明细）        │
│  权限：⚠️ 修改文件，需要 authorized=true              │
└──────────────┬──────────────────────────────────────┘
               │ fix.json
               ▼
         主上下文展示报告
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  generate agent                                      │
│  输入：yaml_path, package, framework                  │
│  可选输入：analyze.json 或 fix.json（判断是否需先修复） │
│  输出：generate.json（文件清单 + 代码片段）            │
│  权限：创建新文件，覆盖需 --force                      │
└─────────────────────────────────────────────────────┘
```

### 权限模型

| Agent | 文件操作 | 需要确认 | 校验项 |
|-------|---------|---------|--------|
| **analyze** | 只读 | 不需要 | YAML 存在 + 可读 + 包名合法 |
| **fix** | ⚠️ 修改 YAML | **需要** `authorized=true` | 文件可写 + 已备份 + 包名合法 |
| **generate** | 创建文件 | 覆盖时需要 `--force` | 输出目录可写 + 框架合法 + 包名合法 |

**确认规则**：

- 用户说"修复"/"自动修"/"帮我修" → `authorized=true`
- 用户说"完整走一遍" → 流程中包含修复，视为 `authorized=true`
- 用户只说"分析一下"/"看看有什么问题" → `authorized=false`，**不能触发 fix agent**
- 必须先展示分析结果，用户确认后才执行修复

### JSON 接口规范

所有 agent 输出必须包含以下公共字段：

```json
{
  "status": "success | error | partial",
  "task": "analyze | fix | generate",
  "file": "<yaml-path>",
  "build_success": true,
  "error_message": null,
  "next_step": "fix | generate | none"
}
```

- `status: "error"` 时 `error_message` 必须有值
- `next_step` 指向推荐的下一步 agent 任务
- 主上下文根据 `status` 决定是否继续流程
- `next_step: "none"` 表示流程结束

### 输出模板文件

- [`assets/templates/analyze-report.md`](assets/templates/analyze-report.md) — 分析报告 Markdown 模板
- [`assets/templates/fix-report.md`](assets/templates/fix-report.md) — 修复报告 Markdown 模板
- [`assets/templates/generate-report.md`](assets/templates/generate-report.md) — 生成报告 Markdown 模板

模板使用 `{{variable}}` 占位符，用 subagent 返回的 JSON 数据填充。

### 多步骤编排

"完整走一遍"时，按以下顺序：

1. 主上下文跑 `check-env.sh`
2. 如需构建 → subagent 构建
3. subagent 分析 → 主上下文读结果 + 填充模板展示
4. subagent 修复 → 主上下文读结果 + 填充模板展示
5. subagent 生成 → 主上下文读结果 + 填充模板展示

分析和修复串行（修复依赖分析结果），但构建可以和 YAML 概览读取并行。

## ① 分析：DFX 规则校验

当用户想检查 YAML 是否有规范性问题时执行。

1. 读取 [`agents/analyze.md`](agents/analyze.md) 传给 subagent
2. Subagent 执行 `run-codegen.sh analyze`，返回 JSON
3. 读取 [`assets/templates/analyze-report.md`](assets/templates/analyze-report.md)，用 JSON 填充后展示

### DFX 规则速查

完整规则表见 [`references/dfx-rules.md`](references/dfx-rules.md)。按严重程度分三类：
- **自动修复**：路径 `//`、缺少 operationId、分页参数范围等
- **需手动确认**：必填字段缺少 `@NotNull`/`@NotBlank`
- **报错**：minLength > maxLength、YAML 语法错误等

## ② 自动修复

当用户想修复 YAML 中可自动修复的问题时执行。

1. 读取 [`agents/fix.md`](agents/fix.md) 传给 subagent
2. Subagent 备份→执行 `run-codegen.sh fix`→diff→返回 JSON
3. 读取 [`assets/templates/fix-report.md`](assets/templates/fix-report.md)，用 JSON 填充后展示

修复会直接修改原始 YAML。Subagent 会自动备份，修复成功后删除备份，失败则保留。

## ③ 代码生成

当用户想从 YAML 生成 Java 代码时执行。

### 框架自动检测

先看用户项目的 `pom.xml` 或 `build.gradle`：
- 包含 `spring-boot-starter-web` 或 `spring-web` → **Spring MVC**，`--framework=spring`
- 包含 `cxf-rt-frontend-jaxrs` → **CXF**，`--framework=cxf`
- 都没有 → 询问用户，默认 Spring MVC

### 执行流程

1. 读取 [`agents/generate.md`](agents/generate.md) 传给 subagent
2. Subagent 执行 `run-codegen.sh generate`，返回 JSON
3. 读取 [`assets/templates/generate-report.md`](assets/templates/generate-report.md)，用 JSON 填充后展示

### Maven 插件参数

完整参数见 [`references/maven-params.md`](references/maven-params.md)。

常用组合：

| 场景 | 额外参数 |
|------|---------|
| 基础生成 | 无 |
| 强制覆盖 | `--force`（会先 .bak 备份） |
| 加版权头 | `--company="Company Name"` |
| 指定输出目录 | `--output=./out` |

### 输出结构

```
<outputDir>/
├── generated/api/<package>/api/     # Controller（不覆盖，需手动复制）
├── src/main/java/req/<package>/req/ # Request（自动覆盖）
└── src/main/java/rsp/<package>/rsp/ # Response（自动覆盖）
```

## ④ 预览

### 方式一：Web UI

```bash
bash scripts/run-codegen.sh webui [--port=18080]
```

Web UI 必须通过 `server.js` 启动，不能直接打开 `web-ui/index.html`。

### 方式二：命令行

直接读取生成的文件，在对话中展示 diff 或代码。

## 自定义注解

用户可以在 YAML 中直接添加自定义 Java 注解。

```yaml
paths:
  /users:
    x-java-class-annotations:        # 类级别 → Controller 类
      - "@Secured"
      - "@AuditLog(action='USER_QUERY')"
    post:
      operationId: createUser
      x-java-method-annotations:      # 方法级别 → 对应方法
        - "@Permission('user:create')"
        - "@Transactional"
```

规则：`x-java-class-annotations` 写在 path 层，`x-java-method-annotations` 写在 HTTP 方法层。同路径下多方法共享类注解。两种都可选。

## YAML 格式自动检测

- 顶层 `swagger: "2.0"` → Swagger 2.0
- 顶层 `openapi: 3.x` → OpenAPI 3.0

无需手动指定。

## 从零创建 YAML

- [`assets/swagger2-template.yaml`](assets/swagger2-template.yaml) — Swagger 2.0 CRUD 模板
- [`assets/openapi3-template.yaml`](assets/openapi3-template.yaml) — OpenAPI 3.0 等价模板

复制模板到用户项目，修改后走分析→修复→生成流程。

## 故障排查

| 场景 | 现象 | 排查 |
|------|------|------|
| 构建 | 下载依赖超时 | `cat ~/.m2/settings.xml` 检查 proxy |
| 构建 | `invalid source release: 21` | JDK 版本不对 |
| 构建 | `./mvnw` 权限不足 | `chmod +x mvnw` |
| 插件 | `plugin not found` | 先 `./mvnw clean install -DskipTests` |
| 插件 | YAML 解析失败 | 检查编码 UTF-8（无 BOM） |
| 插件 | 生成结果不一致 | `source_stale=true` → 重新构建 |
| Web UI | `node: not found` | 安装 Node.js 22+ |
| Web UI | `npm install` 失败 | 检查网络/npm 镜像 |

## 常见用户意图与对应动作

| 用户说 | 做什么 |
|-------|--------|
| "帮我看看这个 YAML" | `check-env.sh` → subagent analyze → 分析报告模板 |
| "修复一下" | `check-env.sh` → subagent fix → 修复报告模板 |
| "生成代码" | `check-env.sh` → subagent generate → 生成报告模板 |
| "看看改了什么" | `check-env.sh` → Web UI 或命令行 diff |
| "加个权限注解" | 帮写 x-java-*-annotations |
| "完整走一遍" | `check-env.sh` → analyze → fix → generate → 预览 |
| "启动 Web UI" | `check-env.sh` → `run-codegen.sh webui` |
| "我没有 YAML" | 使用 assets 下的模板 |
