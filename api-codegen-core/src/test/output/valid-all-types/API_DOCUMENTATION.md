# API 文档 - valid-all-types.yaml

## 概述

| 项目 | 值 |
|------|-----|
| API 数量 | 5 |
| 文件路径 | `src/test/resources/yaml/valid-all-types.yaml` |
| 用途 | 测试所有支持的数据类型和校验规则 |

---

## API 列表

### 1. createUser - 创建用户

#### 基本信息

| 项目 | 值 |
|------|-----|
| 接口名称 | `createUser` |
| 请求路径 | `/api/users` |
| 请求方法 | `POST` |
| 描述 | 创建新用户 |

#### 请求参数 (CreateUserReq)

| 字段名 | 类型 | 必填 | 描述 | 校验规则 |
|--------|------|------|------|---------|
| username | String | 是 | 用户名 | 长度 4-20，匹配正则 `^[a-zA-Z0-9_]+$` |
| password | String | 是 | 密码 | 长度 6-50 |
| email | String | 是 | 邮箱 | 邮箱格式 |
| age | Integer | 否 | 年龄 | 范围 18-150 |
| tags | List\<String\> | 否 | 标签列表 | 元素数 0-10 |
| roles | List\<String\> | 否 | 角色列表 | 元素数 1-5 |
| birthday | LocalDate | 否 | 生日 | 过去时间 |
| registerTime | LocalDateTime | 否 | 注册时间 | 未来时间 |
| status | String | 否 | 状态 | 枚举值: ACTIVE, INACTIVE, PENDING |

#### 响应参数 (CreateUserRsp)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| userId | Long | 用户ID |
| username | String | 用户名 |
| createdAt | LocalDateTime | 创建时间 |

---

### 2. queryUserList - 查询用户列表

#### 基本信息

| 项目 | 值 |
|------|-----|
| 接口名称 | `queryUserList` |
| 请求路径 | `/api/users/list` |
| 请求方法 | `GET` |
| 描述 | 分页查询用户列表 |

#### 请求参数 (QueryUserListReq)

| 字段名 | 类型 | 必填 | 描述 | 校验规则 |
|--------|------|------|------|---------|
| page | Integer | 是 | 页码，从1开始 | 最小值 1 |
| pageSize | Integer | 是 | 每页数量 | 范围 1-100 |
| keyword | String | 否 | 搜索关键词 | 长度 0-50 |

#### 响应参数 (QueryUserListRsp)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| total | Long | 总数量 |
| page | Integer | 当前页码 |
| pageSize | Integer | 每页数量 |
| users | List\<UserInfo\> | 用户列表 |

---

### 3. updateUser - 更新用户

#### 基本信息

| 项目 | 值 |
|------|-----|
| 接口名称 | `updateUser` |
| 请求路径 | `/api/users/{userId}` |
| 请求方法 | `PUT` |
| 描述 | 更新用户信息 |

#### 请求参数 (UpdateUserReq)

| 字段名 | 类型 | 必填 | 描述 | 校验规则 |
|--------|------|------|------|---------|
| userId | Long | 是 | 用户ID | 最小值 1 |
| username | String | 否 | 用户名 | 长度 4-20 |
| email | String | 否 | 邮箱 | 邮箱格式 |
| profile | Profile | 否 | 用户资料 | 嵌套对象 |

**Profile 嵌套对象**

| 字段名 | 类型 | 必填 | 描述 | 校验规则 |
|--------|------|------|------|---------|
| bio | String | 否 | 个人简介 | 长度 0-500 |
| avatarUrl | String | 否 | 头像URL | URL格式 |
| socialLinks | List\<SocialLink\> | 否 | 社交链接 | 元素数 0-5 |

**SocialLink 嵌套对象**

| 字段名 | 类型 | 必填 | 描述 | 校验规则 |
|--------|------|------|------|---------|
| platform | String | 是 | 平台名称 | 枚举值: TWITTER, FACEBOOK, LINKEDIN |
| url | String | 是 | 链接地址 | URL格式 |

#### 响应参数 (UpdateUserRsp)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| success | Boolean | 是否成功 |
| updatedAt | LocalDateTime | 更新时间 |

---

### 4. deleteUser - 删除用户

#### 基本信息

| 项目 | 值 |
|------|-----|
| 接口名称 | `deleteUser` |
| 请求路径 | `/api/users/{userId}` |
| 请求方法 | `DELETE` |
| 描述 | 删除用户 |

#### 请求参数 (DeleteUserReq)

| 字段名 | 类型 | 必填 | 描述 | 校验规则 |
|--------|------|------|------|---------|
| userId | Long | 是 | 用户ID | 最小值 1 |
| reason | String | 否 | 删除原因 | 长度 1-200 |

#### 响应参数 (DeleteUserRsp)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| success | Boolean | 是否成功 |
| deletedAt | LocalDateTime | 删除时间 |

---

### 5. batchCreateUsers - 批量创建用户

#### 基本信息

| 项目 | 值 |
|------|-----|
| 接口名称 | `batchCreateUsers` |
| 请求路径 | `/api/users/batch` |
| 请求方法 | `POST` |
| 描述 | 批量创建用户 |

#### 请求参数 (BatchCreateUsersReq)

| 字段名 | 类型 | 必填 | 描述 | 校验规则 |
|--------|------|------|------|---------|
| users | List\<BatchUser\> | 是 | 用户列表 | 元素数 1-100 |
| departmentId | Long | 是 | 部门ID | 最小值 1 |

**BatchUser 嵌套对象**

| 字段名 | 类型 | 必填 | 描述 | 校验规则 |
|--------|------|------|------|---------|
| username | String | 是 | 用户名 | 长度 4-20 |
| email | String | 是 | 邮箱 | 邮箱格式 |
| roles | List\<String\> | 是 | 角色列表 | 元素数 1-3 |

#### 响应参数 (BatchCreateUsersRsp)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| successCount | Integer | 成功数量 |
| failedCount | Integer | 失败数量 |
| results | List\<BatchUserResult\> | 详细结果 |

**BatchUserResult 嵌套对象**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| username | String | 用户名 |
| userId | Long | 用户ID |
| success | Boolean | 是否成功 |
| errorMessage | String | 错误信息 |

---

## 输出路径配置

| 类型 | 输出路径 | 覆盖策略 |
|------|---------|---------|
| Controller | `generated/api/com/apicgen/api/` | 不覆盖（手动复制） |
| Request | `src/main/java/com/apicgen/req/` | 自动覆盖 |
| Response | `src/main/java/com/apicgen/rsp/` | 自动覆盖 |

---

## 生成的文件清单

### Controllers
- `CreateController.java` - 创建用户
- `QueryController.java` - 查询用户列表
- `UpdateController.java` - 更新用户
- `DeleteController.java` - 删除用户
- `BatchCreateUsersController.java` - 批量创建用户

### Request 类
- `CreateUserReq.java`
- `QueryUserListReq.java`
- `UpdateUserReq.java`
- `DeleteUserReq.java`
- `BatchCreateUsersReq.java`
- `Profile.java`（嵌套）
- `SocialLink.java`（嵌套）
- `BatchUser.java`（嵌套）
- `BatchUserResult.java`（嵌套）

### Response 类
- `CreateUserRsp.java`
- `QueryUserListRsp.java`
- `UpdateUserRsp.java`
- `DeleteUserRsp.java`
- `BatchCreateUsersRsp.java`
- `UserInfo.java`（嵌套）
