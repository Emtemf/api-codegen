# 自定义注解完整示例

本文档展示 `x-java-class-annotations` 和 `x-java-method-annotations` 的完整工作流：从 YAML 定义到生成的 Java 代码。

## YAML 输入

```yaml
swagger: "2.0"
info:
  title: User API
  version: "1.0"
paths:
  /users:
    x-java-class-annotations:
      - "@Secured"
      - "@AuditLog(action='USER_QUERY')"
    get:
      summary: 获取用户列表
      operationId: getUsers
      x-java-method-annotations:
        - "@Permission('user:read')"
        - "@RateLimiter(maxRequests=100)"
      responses:
        "200":
          description: OK
    post:
      summary: 创建用户
      operationId: createUser
      x-java-method-annotations:
        - "@Permission('user:create')"
        - "@Transactional"
        - "@AuditLog(action='CREATE_USER')"
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
            properties:
              username:
                type: string
                minLength: 1
                maxLength: 50
      responses:
        "201":
          description: Created

  /users/{id}:
    get:
      summary: 获取单个用户
      operationId: getUserById
      x-java-method-annotations:
        - "@Cacheable(key='#id', cacheName='users')"
        - "@Permission('user:read')"
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
      responses:
        "200":
          description: OK

  /admin/dashboard:
    x-java-class-annotations:
      - "@Secured"
      - "@RequireRole('ADMIN')"
      - "@CrossOrigin(origins='https://admin.example.com')"
    get:
      summary: 获取管理仪表盘
      operationId: getAdminDashboard
      responses:
        "200":
          description: OK
```

## 生成命令

```bash
java -cp api-codegen-core/target/api-codegen.jar com.apicgen.Main annotation-demo.yaml \
  -o ./output \
  -p com.example.demo
```

或使用 Maven 插件：

```bash
mvn com.apicgen:api-codegen-maven-plugin:generate \
  -DyamlFile=annotation-demo.yaml \
  -DbasePackage=com.example.demo \
  -DoutputDir=./output
```

## 生成的 Java 代码

### GET /users → QueryController.java

```java
/**
 * 此文件由 api-codegen 自动生成，请勿手动修改
 */

package com.apicgen.api;

import javax.ws.rs.*;
import javax.validation.Valid;
import com.apicgen.rsp.Response;

/**
 * 获取用户列表
 */
@Secured
@AuditLog(action='USER_QUERY')
@Path("/users")
public class QueryController {

    /**
     * 获取用户列表
     */
    @Permission('user:read')
    @RateLimiter(maxRequests=100)
    @GET
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response query() {
        // TODO: 实现业务逻辑
        return null;
    }
}
```

**注解来源对照：**

| 生成代码位置 | 注解 | YAML 来源 |
|-------------|------|----------|
| 类声明前 | `@Secured` | `paths./users.x-java-class-annotations[0]` |
| 类声明前 | `@AuditLog(action='USER_QUERY')` | `paths./users.x-java-class-annotations[1]` |
| 方法声明前 | `@Permission('user:read')` | `paths./users.get.x-java-method-annotations[0]` |
| 方法声明前 | `@RateLimiter(maxRequests=100)` | `paths./users.get.x-java-method-annotations[1]` |

### POST /users → CreateController.java

```java
/**
 * 此文件由 api-codegen 自动生成，请勿手动修改
 */

package com.apicgen.api;

import javax.ws.rs.*;
import javax.validation.Valid;
import com.apicgen.rsp.Response;
import com.apicgen.req.Request;

/**
 * 创建用户
 */
@Secured
@AuditLog(action='USER_QUERY')
@Path("/users")
public class CreateController {

    /**
     * 创建用户
     */
    @Permission('user:create')
    @Transactional
    @AuditLog(action='CREATE_USER')
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response create(@Size(min=1, max=50) String username, @Valid Request req) {
        // TODO: 实现业务逻辑
        return null;
    }
}
```

**注解来源对照：**

| 生成代码位置 | 注解 | YAML 来源 |
|-------------|------|----------|
| 类声明前 | `@Secured` | `paths./users.x-java-class-annotations[0]` |
| 类声明前 | `@AuditLog(action='USER_QUERY')` | `paths./users.x-java-class-annotations[1]` |
| 方法声明前 | `@Permission('user:create')` | `paths./users.post.x-java-method-annotations[0]` |
| 方法声明前 | `@Transactional` | `paths./users.post.x-java-method-annotations[1]` |
| 方法声明前 | `@AuditLog(action='CREATE_USER')` | `paths./users.post.x-java-method-annotations[2]` |

### GET /users/{id} → QueryController.java

```java
/**
 * 此文件由 api-codegen 自动生成，请勿手动修改
 */

package com.apicgen.api;

import javax.ws.rs.*;
import javax.validation.Valid;
import com.apicgen.rsp.Response;
import com.apicgen.req.Request;

/**
 * 获取单个用户
 */
@Path("/users/{id}")
public class QueryController {

    /**
     * 获取单个用户
     */
    @Cacheable(key='#id', cacheName='users')
    @Permission('user:read')
    @GET
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response query(@PathParam("id") @NotNull @Min(1) @Max(2147483647) Integer id) {
        // TODO: 实现业务逻辑
        return null;
    }
}
```

**注解来源对照：**

| 生成代码位置 | 注解 | YAML 来源 |
|-------------|------|----------|
| 方法声明前 | `@Cacheable(key='#id', cacheName='users')` | `paths./users/{id}.get.x-java-method-annotations[0]` |
| 方法声明前 | `@Permission('user:read')` | `paths./users/{id}.get.x-java-method-annotations[1]` |

> 注意：此路径没有 `x-java-class-annotations`，所以类声明前没有自定义注解。

### GET /admin/dashboard → QueryController.java

```java
/**
 * 此文件由 api-codegen 自动生成，请勿手动修改
 */

package com.apicgen.api;

import javax.ws.rs.*;
import javax.validation.Valid;
import com.apicgen.rsp.Response;

/**
 * 获取管理仪表盘
 */
@Secured
@RequireRole('ADMIN')
@CrossOrigin(origins='https://admin.example.com')
@Path("/admin/dashboard")
public class QueryController {

    /**
     * 获取管理仪表盘
     */
    @GET
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response query() {
        // TODO: 实现业务逻辑
        return null;
    }
}
```

**注解来源对照：**

| 生成代码位置 | 注解 | YAML 来源 |
|-------------|------|----------|
| 类声明前 | `@Secured` | `paths./admin/dashboard.x-java-class-annotations[0]` |
| 类声明前 | `@RequireRole('ADMIN')` | `paths./admin/dashboard.x-java-class-annotations[1]` |
| 类声明前 | `@CrossOrigin(origins='https://admin.example.com')` | `paths./admin/dashboard.x-java-class-annotations[2]` |

> 注意：此路径没有 `x-java-method-annotations`，所以方法声明前没有自定义注解。

## Spring MVC 风格

使用 `-Dframework=spring` 可生成 Spring MVC 风格代码：

### GET /users → QueryController.java (Spring MVC)

```java
/**
 * 此文件由 api-codegen 自动生成，请勿手动修改
 */

package com.apicgen.api;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import javax.validation.Valid;
import javax.validation.constraints.*;
import java.util.List;
import java.util.Map;

/**
 * 获取用户列表
 */
@Secured
@AuditLog(action='USER_QUERY')
@RestController
@RequestMapping("/users")
public class QueryController {

    @Permission('user:read')
    @RateLimiter(maxRequests=100)
    @GetMapping("/users")
    public ResponseEntity<?> getUsers() {
        // TODO: 实现业务逻辑
        return ResponseEntity.ok().build();
    }
}
```

## 关键规则

1. **类注解位置**：`x-java-class-annotations` 写在 path 层（与 `get`、`post` 同级），渲染到类声明前
2. **方法注解位置**：`x-java-method-annotations` 写在具体 HTTP 方法层（`get`、`post` 内部），渲染到方法声明前
3. **注解顺序**：YAML 数组顺序与生成代码中的顺序一致
4. **跨方法共享**：同一路径下的多个方法共享 `x-java-class-annotations`
5. **可选性**：两种注解都是可选的，可单独使用类注解、方法注解，或两者都不用

## 验证测试

相关测试用例位于 `api-codegen-core/src/test/java/com/apicgen/converter/AnnotationExtractionTest.java`：

- `shouldParseClassAnnotationsFromPathLevel()` - 解析类注解
- `shouldParseMethodAnnotationsFromOperationLevel()` - 解析方法注解
- `shouldGenerateControllerWithClassAnnotations()` - 验证类注解生成
- `shouldGenerateControllerWithMethodAnnotations()` - 验证方法注解生成
