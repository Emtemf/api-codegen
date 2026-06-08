## DFX 分析报告

**文件**：`swagger2-example.yaml`
**格式**：swagger2
**API 数量**：35 个接口

### 概览

| 严重程度 | 数量 |
|---------|------|
| 错误（报错） | 12 |
| 警告（可自动修复） | 46 |
| 信息（需手动确认） | 12 |
| **合计** | **70** |

### 可自动修复（46 项）

| # | DFX 规则 | 位置 | 说明 |
|---|---------|------|------|
| 1 | DFX-004 | Request.id (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 2 | DFX-004 | Request.userId (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 3 | DFX-004 | Request.keyword (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 4 | DFX-004 | Request.email (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 5 | DFX-004 | Request.phone (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 6 | DFX-007 | Request.score (Double) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 7 | DFX-008 | Request.tags (List\<String\>) | List 字段缺少大小校验 - 建议添加 validation.minSize 和 validation.maxSize |
| 8 | DFX-011 | Request.page (Integer) | 页码字段缺少范围校验 - 建议添加 validation.min=1 和 validation.max=2147483647 |
| 9 | DFX-011 | Request.pageNum (Integer) | 页码字段缺少范围校验 - 建议添加 validation.min=1 和 validation.max=2147483647 |
| 10 | DFX-012 | Request.limit (Integer) | 每页数量字段缺少范围校验 - 建议添加 validation.min=1 和 validation.max=100 |
| 11 | DFX-012 | Request.size (Integer) | 每页数量字段缺少范围校验 - 建议添加 validation.min=1 和 validation.max=100 |
| 12 | DFX-014 | Request.id (Integer) | 路径参数缺少最小值校验 - 建议添加 validation.min=1 |
| 13 | DFX-014 | Request.userCode (String) | 路径参数缺少最小长度校验 - 建议添加 validation.minLength=1 |
| 14 | DFX-004 | Response.id (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 15 | DFX-004 | Response.email (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 16 | DFX-004 | Response.phone (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 17 | DFX-004 | Response.id (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 18 | DFX-004 | Response.username (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 19 | DFX-004 | Response.oldPasswordField (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 20 | DFX-004 | Response.legacyCode (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 21 | DFX-004 | Response.email (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 22 | DFX-004 | Response.id (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 23 | DFX-004 | Response.price (Double) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 24 | DFX-004 | Response.quantity (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 25 | DFX-004 | Response.category (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 26 | DFX-004 | Response.orderId (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 27 | DFX-004 | Response.customerId (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 28 | DFX-004 | Response.legacyOrderType (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 29 | DFX-004 | Response.totalAmount (Double) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 30 | DFX-008 | Response.productList (List\<Object\>) | List 字段缺少大小校验 - 建议添加 validation.minSize 和 validation.maxSize |
| 31 | DFX-004 | Request.orderId (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 32 | DFX-004 | Request.customerId (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 33 | DFX-004 | Request.legacyOrderType (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 34 | DFX-004 | Request.totalAmount (Double) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 35 | DFX-008 | Request.productList (List\<Object\>) | List 字段缺少大小校验 - 建议添加 validation.minSize 和 validation.maxSize |
| 36 | DFX-004 | Request.email (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 37 | DFX-004 | Request.phone (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 38 | DFX-004 | Request.id (Integer) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 39 | DFX-004 | Request.email (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 40 | DFX-004 | Request.mobile (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 41 | DFX-004 | Request.userId (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 42 | DFX-004 | Request.userName (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 43 | DFX-007 | Request.amount (Double) | 数值字段缺少范围校验 - 建议添加 validation.min 和 validation.max |
| 44 | DFX-004 | Response.orderId (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 45 | DFX-004 | Response.totalPrice (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |
| 46 | DFX-004 | Response.status (String) | String 字段缺少长度校验 - 建议添加 validation.minLength 和 validation.maxLength |

### 需手动确认（12 项）

| # | DFX 规则 | 位置 | 说明 |
|---|---------|------|------|
| 1 | DFX-005 | Request.email (String) | 邮箱字段建议添加 email 校验 - 添加 validation.email=true |
| 2 | DFX-006 | Request.phone (String) | 电话字段建议添加正则校验 - 添加 validation.pattern="^1[3-9]\\d{9}$" 等 |
| 3 | DFX-005 | Response.email (String) | 邮箱字段建议添加 email 校验 - 添加 validation.email=true |
| 4 | 数值缺 max | Request.price (Double) | 数值字段只有 min，缺少 max - 建议添加 validation.max |
| 5 | 数值缺 max | Request.balance (Double) | 数值字段只有 min，缺少 max - 建议添加 validation.max |
| 6 | 生日校验 | Request.birthday (LocalDate) | 生日字段建议添加 past 校验 - 添加 validation.past=true（只能是过去日期） |
| 7 | DFX-005 | Request.email (String) | 邮箱字段建议添加 email 校验 - 添加 validation.email=true |
| 8 | DFX-006 | Request.mobile (String) | 电话字段建议添加正则校验 - 添加 validation.pattern="^1[3-9]\\d{9}$" 等 |
| 9 | 生日校验 | Request.birthday (LocalDate) | 生日字段建议添加 past 校验 - 添加 validation.past=true（只能是过去日期） |
| 10 | 生日校验 | Request.dob (LocalDate) | 生日字段建议添加 past 校验 - 添加 validation.past=true（只能是过去日期） |
| 11 | 预约校验 | Request.scheduleTime (LocalDateTime) | 预约字段建议添加 future 校验 - 添加 validation.future=true（只能是未来日期） |
| 12 | 预约校验 | Request.appointmentDate (LocalDate) | 预约字段建议添加 future 校验 - 添加 validation.future=true（只能是未来日期） |

### 报错（12 项）

| # | DFX 规则 | 位置 | 说明 |
|---|---------|------|------|
| 1 | DFX-003 | Request.id (Integer) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |
| 2 | DFX-003 | Request.userId (Integer) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |
| 3 | DFX-003 | Request.email (String) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |
| 4 | DFX-003 | Request.phone (String) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |
| 5 | DFX-003 | Request.id (Integer) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |
| 6 | DFX-003 | Request.userCode (String) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |
| 7 | DFX-003 | Request.X-Token (String) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |
| 8 | DFX-003 | Request.username (String) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |
| 9 | DFX-009 | Request.keyword (String) | minLength 不能大于 maxLength - 修改 validation.minLength < validation.maxLength |
| 10 | DFX-010 | Request.age (Integer) | min 不能大于 max - 修改 validation.min < validation.max |
| 11 | DFX-003 | Request.id (Integer) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |
| 12 | DFX-003 | Request.userId (String) | 必填字段缺少 @NotNull/@NotBlank 校验 - 添加 validation.required=true 或 @NotNull 注解 |

### 下一步

运行修复命令可自动处理 46 项警告：
`bash scripts/run-codegen.sh fix swagger2-example.yaml com.example.demo`
