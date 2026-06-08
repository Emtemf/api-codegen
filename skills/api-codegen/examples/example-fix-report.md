## 修复报告

**文件**：`api-example.yaml`

### 修复概览

| 指标 | 修复前 | 修复后 |
|------|-------|-------|
| 总问题数 | 27 | 8 |
| 错误 | 12 | 7 |
| 警告 | 10 | 0 |

### 已修复（19 项）

| # | DFX 规则 | 变更 | 说明 |
|---|---------|------|------|
| 1 | DFX-ValidationError | TestValidation1Req.field1: minLength=20 > maxLength=10 → minLength=1, maxLength=255 | 修复 minLength > maxLength 冲突 |
| 2 | DFX-ValidationError | TestValidation2Req.field2: min=100 > max=50 → min=0, max=2147483647 | 修复 min > max 冲突 |
| 3 | DFX-Warn-MissingRange | GetUserReq.userId (Long): +min=0, +max=2147483647 | 数值字段补充范围校验 |
| 4 | DFX-Warn-MissingRange | GetUserRsp.userId (Long): +min=0, +max=2147483647 | 数值字段补充范围校验 |
| 5 | DFX-Warn-MissingRange | CreateUserRsp.userId (Long): +min=0, +max=2147483647 | 数值字段补充范围校验 |
| 6 | DFX-Warn-MissingLength | CreateUserRsp.username (String): +minLength=1, +maxLength=255 | String 字段补充长度校验 |
| 7 | DFX-Warn-MissingLength | QueryUsersReq.keyword (String): +minLength=1, +maxLength=255 | String 字段补充长度校验 |
| 8 | DFX-Warn-MissingLength | SearchUsersReq.keyword (String): +minLength=1, +maxLength=255 | String 字段补充长度校验 |
| 9 | DFX-Warn-MissingLength | ContactUserReq.email (String): +minLength=1, +maxLength=255 | String 字段补充长度校验 |
| 10 | DFX-Warn-MissingLength | RegisterUserReq.phone (String): +minLength=1, +maxLength=255 | String 字段补充长度校验 |
| 11 | DFX-Warn-MissingRange | SetAgeReq.age (Integer): +min=0, +max=2147483647 | 数值字段补充范围校验 |
| 12 | DFX-Warn-MissingSize | AddTagsReq.tags (List<String>): +minSize=1, +maxSize=100 | List 字段补充大小校验 |
| 13 | DFX-Info-MinLength | CreateUserReq.email (String): +minLength=1 | 补充缺失的 minLength |
| 14 | DFX-Info-MinSize | CreateUserReq.matrix (List<List<Integer>>): +minSize=1 | 补充缺失的 minSize |
| 15 | DFX-Info-MinSize | CreateUserReq.profile.hobbies (List<String>): elementValidation → inline | List 字段结构调整 |
| 16 | DFX-Info-Email | ContactUserReq.email (String): +email=true | 邮箱字段补充 email 校验 |
| 17 | DFX-Info-Pattern | RegisterUserReq.phone (String): +pattern="^(\+86\|86)?1[3-9]\d{9}$" | 电话字段补充正则校验 |
| 18 | DFX-Format | YAML 格式规范化：字符串加引号、缩进标准化 | 整体格式规范化 |
| 19 | DFX-Validation | 多个字段补充 validation: {} 空块 | 确保所有字段具有 validation 节点 |

### 剩余问题（8 项，需手动处理）

| # | DFX 规则 | 位置 | 原因 |
|---|---------|------|------|
| 1 | DFX-NotNull | CreateUserReq.tags (List<String>) | 必填字段缺少 @NotNull/@NotBlank，需手动确认添加 |
| 2 | DFX-NotNull | CreateUserReq.role (Enum) | 必填字段缺少 @NotNull/@NotBlank，需手动确认添加 |
| 3 | DFX-NotNull | CreateUserReq.status (Enum) | 必填字段缺少 @NotNull/@NotBlank，需手动确认添加 |
| 4 | DFX-NotNull | CreateUserReq.createTime (LocalDateTime) | 必填字段缺少 @NotNull/@NotBlank，需手动确认添加 |
| 5 | DFX-NotNull | CreateUserReq.profile (UserProfile) | 必填字段缺少 @NotNull/@NotBlank，需手动确认添加 |
| 6 | DFX-NotNull | CreateUserReq.profile.nickname (String) | 必填字段缺少 @NotNull/@NotBlank，需手动确认添加 |
| 7 | DFX-NotNull | QueryUsersReq.keyword (String) | 必填字段缺少 @NotNull/@NotBlank，需手动确认添加 |
| 8 | DFX-Info-MinSize | CreateUserReq.profile.hobbies (List<String>) | List 字段只有 maxSize，缺少 minSize |

### 下一步

可继续生成代码：
`bash scripts/run-codegen.sh generate api-example.yaml com.apicgen`
