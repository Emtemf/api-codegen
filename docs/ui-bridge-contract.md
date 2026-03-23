# UI Bridge Contract

`api-codegen-core` 通过 `com.apicgen.bridge.UiBridgeMain` 暴露本地 JSON bridge，
供 Web UI、IDEA 插件、浏览器插件复用同一套分析/修复能力。

## 固定元数据

- `bridge`: `api-codegen-ui-bridge`
- `contractVersion`: `1`
- `command`: `analyze` 或 `fix`

## 分析响应

字段：

- `sourceFormat`: 兼容字段，当前等同于 `inputFormat`
- `inputFormat`: 输入 YAML 的格式，`swagger` 或 `custom`
- `outputFormat`: bridge 产出的规范化 YAML 格式；当前固定为 `custom`
- `issues`: 规则问题列表
- `normalizedYaml`: core 规范化后的 YAML

Issue 字段：

- `severity`: `error` / `warn` / `info`
- `message`: 面向用户的说明
- `rule`: 完整规则文本
- `ruleCode`: 机器可读规则编号，例如 `DFX-001`
- `key`: 问题稳定标识，可用于 fix 选择
- `fixable`: 是否支持自动修复

## 修复响应

字段：

- `sourceFormat`: 兼容字段，当前等同于 `inputFormat`
- `inputFormat`: 修复前输入格式
- `outputFormat`: 修复后 YAML 格式
- `issues`: 对修复结果重新分析后的问题列表
- `fixedYaml`: 修复后的 YAML
- `fixedCount`: 本次应用的修复数量

## 错误响应

`server.js` 适配层在请求失败时返回统一 error envelope：

- `bridge`
- `contractVersion`
- `command`
- `error.code`
- `error.message`

当前已约定的 `error.code`：

- `INVALID_JSON_BODY`
- `CORE_BRIDGE_REQUEST_FAILED`

## 兼容性说明

- 插件应优先使用 `bridge`、`contractVersion`、`command`、`inputFormat`、`outputFormat`、`ruleCode`
- `sourceFormat` 保留给现有 Web UI / 历史调用方，后续不建议作为唯一格式判断依据
