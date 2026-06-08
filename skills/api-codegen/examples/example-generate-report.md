## 代码生成报告

**文件**：`/home/wula/IdeaProjects/api-codegen/openapi3-example.yaml`
**框架**：Spring MVC
**包名**：`com.example.demo`
**输出目录**：`/tmp/api-codegen-test2`

### 生成文件

| 类型 | 文件路径 | 说明 |
|------|---------|------|
| controller | `generated/api/com/example/demo/api/BindPhoneController.java` | bindPhone |
| controller | `generated/api/com/example/demo/api/CreateAppointmentController.java` | createAppointment |
| controller | `generated/api/com/example/demo/api/CreateInconsistentController.java` | createInconsistent |
| controller | `generated/api/com/example/demo/api/CreateOrderController.java` | createOrder |
| controller | `generated/api/com/example/demo/api/CreateOrderModelController.java` | createOrderModel |
| controller | `generated/api/com/example/demo/api/ExportOrdersController.java` | exportOrders |
| controller | `generated/api/com/example/demo/api/GetAdminUserByIdController.java` | getAdminUserById |
| controller | `generated/api/com/example/demo/api/GetAdminUsersController.java` | getAdminUsers |
| controller | `generated/api/com/example/demo/api/GetInconsistentController.java` | getInconsistent |
| controller | `generated/api/com/example/demo/api/GetLegacyUserModelController.java` | getLegacyUserModel |
| controller | `generated/api/com/example/demo/api/GetOrderByIdController.java` | getOrderById |
| controller | `generated/api/com/example/demo/api/GetOrderByNoController.java` | getOrderByNo |
| controller | `generated/api/com/example/demo/api/GetOrderDetailController.java` | getOrderDetail |
| controller | `generated/api/com/example/demo/api/GetOrderDetailFullController.java` | getOrderDetailFull |
| controller | `generated/api/com/example/demo/api/GetOrderInfoController.java` | getOrderInfo |
| controller | `generated/api/com/example/demo/api/GetOrderListController.java` | getOrderList |
| controller | `generated/api/com/example/demo/api/GetOrderModelController.java` | getOrderModel |
| controller | `generated/api/com/example/demo/api/GetPriceController.java` | getPrice |
| controller | `generated/api/com/example/demo/api/GetProductModelController.java` | getProductModel |
| controller | `generated/api/com/example/demo/api/GetSecureConfigController.java` | getSecureConfig |
| controller | `generated/api/com/example/demo/api/GetUserModelController.java` | getUserModel |
| controller | `generated/api/com/example/demo/api/ListItems2Controller.java` | listItems2 |
| controller | `generated/api/com/example/demo/api/ListItemsController.java` | listItems |
| controller | `generated/api/com/example/demo/api/QueryInvalidRangeController.java` | queryInvalidRange |
| controller | `generated/api/com/example/demo/api/QueryMissingDescController.java` | queryMissingDesc |
| controller | `generated/api/com/example/demo/api/RegisterUserController.java` | registerUser |
| controller | `generated/api/com/example/demo/api/SearchInvalidLengthController.java` | searchInvalidLength |
| controller | `generated/api/com/example/demo/api/SearchOrdersController.java` | searchOrders |
| controller | `generated/api/com/example/demo/api/SendNotifyController.java` | sendNotify |
| controller | `generated/api/com/example/demo/api/SetBirthdayController.java` | setBirthday |
| controller | `generated/api/com/example/demo/api/SetProductsController.java` | setProducts |
| controller | `generated/api/com/example/demo/api/UpdateSecureConfigController.java` | updateSecureConfig |
| controller | `generated/api/com/example/demo/api/VerifyEmailController.java` | verifyEmail |
| request | `src/main/java/req/com/example/demo/req/Request.java` | 统一请求体 |
| response | `src/main/java/rsp/com/example/demo/rsp/Response.java` | 统一响应体 |

**共 35 个文件**

### Controller 摘要

**`GetUserModelController.java`**
```java
package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import javax.validation.Valid;
import javax.validation.constraints.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/model/user")
public class GetUserModelController {

    @GetMapping("/v1/model/user")
    public ResponseEntity<?> getUserModel() {
        // TODO: 实现业务逻辑
        return ResponseEntity.ok().build();
    }
}
```

**`CreateOrderController.java`**
```java
package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import javax.validation.Valid;
import javax.validation.constraints.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/orders/create")
public class CreateOrderController {

    @PostMapping("/v1/orders/create")
    public ResponseEntity<?> createOrder(@RequestBody @NotNull @Min(1) Integer customerId, @RequestBody @NotBlank @Email String contactEmail, @RequestBody @NotBlank @Pattern(regexp = "^1[3-9]\\d{9}$") String contactPhone, @RequestBody @Size(min=1, max=500) String remark, @RequestBody @Min(0) @Max(100) Double discount, @RequestBody @NotNull @Size(min=1, max=100) List<Object> items) {
        // TODO: 实现业务逻辑
        return ResponseEntity.ok().build();
    }
}
```

**`SearchOrdersController.java`**
```java
package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import javax.validation.Valid;
import javax.validation.constraints.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/api/search")
public class SearchOrdersController {

    @GetMapping("/v1/api/search")
    public ResponseEntity<?> searchOrders(@RequestParam("keyword") String keyword) {
        // TODO: 实现业务逻辑
        return ResponseEntity.ok().build();
    }
}
```

**`Request.java`**
```java
package com.example.demo.req;

import javax.validation.constraints.*;
import java.util.List;
import lombok.Data;

@Data
public class Request {

    /** 订单ID */
    private Integer orderId;

    /** 订单编号 */
    private String orderNo;

    /** 客户姓名 */
    private String customerName;

    /** 联系邮箱 */
    private String contactEmail;

    /** 联系电话 */
    private String contactPhone;

    /** 旧版订单类型(修复后删除) */
    private String legacyOrderType;

    /** 订单金额(修复后将增加minimum:0) */
    private Double totalAmount;

    /** 商品列表 */
    private List<Object> productList;
}
```

**`Response.java`**
```java
package com.example.demo.rsp;

import javax.validation.constraints.*;
import lombok.Data;

@Data
public class Response {

    /** 用户ID */
    private Integer userId;

    /** 用户名 */
    private String username;

    /** 邮箱 */
    private String email;

    /** 手机号 */
    private String phone;
}
```

### 自动修复记录

生成前自动修复了 YAML 中的 2 个 DFX 阻断性错误：

1. `apis[26].request.fields[0].validation` - minLength(100) > maxLength(10)，修正为 minLength=1, maxLength=100
2. `apis[27].request.fields[0].validation` - minimum(100) > maximum(10)，修正为 minimum=10, maximum=100

原始 YAML 文件已通过 `git checkout` 恢复。

### 下一步

1. 将 Controller 文件复制到项目源码目录
2. 编写业务逻辑（替换 `// TODO` 占位符）
3. Request/Response 文件可直接引用，后续重新生成会自动更新
