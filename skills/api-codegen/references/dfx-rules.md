# DFX 规则速查

## 路径规范

| DFX | 场景 | 处理方式 |
|-----|------|---------|
| DFX-001 | 路径包含 `//` | 自动删除重复斜杠 |
| DFX-002 | 路径不以 `/` 开头 | 自动添加 `/` 前缀 |

## 参数校验

| DFX | 场景 | 处理方式 |
|-----|------|---------|
| DFX-003 | required=true 缺少 @NotNull/@NotBlank | 需手动确认 |
| DFX-011 | page/pageNum 缺少范围 | 自动添加 min:1, max:2147483647 |
| DFX-012 | pageSize/limit/size 缺少范围 | 自动添加 min:1, max:100 |
| DFX-014 | 路径参数缺少校验 | 自动添加 min:1 或 minLength:1 |

## 字段校验

| DFX | 场景 | 处理方式 |
|-----|------|---------|
| DFX-004 | String 字段缺少长度校验 | 自动添加 minLength:1, maxLength:255 |
| DFX-005 | email 字段缺少格式校验 | 自动添加 format: email |
| DFX-006 | phone/mobile 字段缺少正则 | 自动添加 pattern |
| DFX-007 | 数值字段缺少范围 | 自动添加 min/max |
| DFX-008 | List 字段缺少大小 | 自动添加 minSize/maxSize |

## 校验规则冲突（报错）

| DFX | 场景 |
|-----|------|
| DFX-009 | minLength 超过 maxLength |
| DFX-010 | min 超过 max（数值） |
| DFX-011 | minSize 超过 maxSize |

## 接口规范

| DFX | 场景 | 处理方式 |
|-----|------|---------|
| DFX-012 | 缺少 operationId | 自动生成 |
| DFX-013 | 缺少成功响应 2xx | 警告 |
| DFX-015 | 缺少 API 名称 | 报错 |
| DFX-016 | 缺少 API 路径 | 报错 |
| DFX-017 | 缺少 HTTP 方法 | 报错 |

## YAML 语法

| DFX | 场景 |
|-----|------|
| DFX-018 | 重复的键 |
| DFX-019 | YAML 格式错误 |

## 必填参数注解映射

| 参数类型 | 必填注解 |
|---------|---------|
| String 必填 | `@NotBlank` |
| 其他类型必填 | `@NotNull` |
