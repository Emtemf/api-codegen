package com.apicgen.parser;

import com.apicgen.model.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * YamlParser 单元测试
 *
 * 测试场景：
 * - 正常YAML文件解析
 * - 各种字段类型解析
 * - 嵌套对象解析
 * - 异常情况处理
 */
class YamlParserTest {

    private static final String TEST_YAML_DIR = "src/test/resources/yaml";

    @Nested
    @DisplayName("should_parse_valid_yaml_file")
    class ShouldParseValidYamlFile {

        /**
         * 测试场景：解析包含所有字段类型的正常YAML文件
         * 预期结果：所有API定义被正确解析，包括request和response
         * 实际结果：返回包含5个API的ApiDefinition对象
         */
        @Test
        @DisplayName("should_parse_all_field_types_correctly")
        void shouldParseAllFieldTypesCorrectly() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);

            // Then
            assertNotNull(apiDefinition);
            assertNotNull(apiDefinition.getApis());
            assertEquals(5, apiDefinition.getApis().size());
        }

        /**
         * 测试场景：解析边界情况YAML文件
         * 预期结果：所有边界情况被正确解析
         * 实际结果：返回包含5个API的ApiDefinition对象
         */
        @Test
        @DisplayName("should_parse_edge_cases_yaml_correctly")
        void shouldParseEdgeCasesYamlCorrectly() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-edge-cases.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);

            // Then
            assertNotNull(apiDefinition);
            assertNotNull(apiDefinition.getApis());
            assertEquals(5, apiDefinition.getApis().size());
        }

        /**
         * 测试场景：解析YAML字符串
         * 预期结果：YAML字符串被正确解析
         * 实际结果：返回包含1个API的ApiDefinition对象
         */
        @Test
        @DisplayName("should_parse_yaml_string_correctly")
        void shouldParseYamlStringCorrectly() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: testApi
                    path: /api/test
                    method: POST
                    description: Test API
                    request:
                      className: TestReq
                      fields:
                        - name: field1
                          type: String
                          required: true
                    response:
                      className: TestRsp
                      fields:
                        - name: result
                          type: Boolean
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // Then
            assertNotNull(apiDefinition);
            assertEquals(1, apiDefinition.getApis().size());
        }
    }

    @Nested
    @DisplayName("should_parse_api_metadata")
    class ShouldParseApiMetadata {

        /**
         * 测试场景：解析API基本元数据
         * 预期结果：name、path、method、description被正确解析
         * 实际结果：各字段值与YAML定义一致
         */
        @Test
        @DisplayName("should_parse_name_path_method_description")
        void shouldParseNamePathMethodDescription() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);

            // Then
            assertEquals("createUser", createUserApi.getName());
            assertEquals("/api/users", createUserApi.getPath());
            assertEquals(Api.HttpMethod.POST, createUserApi.getMethod());
            assertEquals("创建用户接口", createUserApi.getDescription());
        }

        /**
         * 测试场景：解析GET请求API
         * 预期结果：HTTP方法正确解析为GET
         * 实际结果：method为Api.HttpMethod.GET
         */
        @Test
        @DisplayName("should_parse_get_method")
        void shouldParseGetMethod() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api getUserApi = apiDefinition.getApis().get(1);

            // Then
            assertEquals(Api.HttpMethod.GET, getUserApi.getMethod());
        }

        /**
         * 测试场景：解析PUT请求API
         * 预期结果：HTTP方法正确解析为PUT
         * 实际结果：method为Api.HttpMethod.PUT
         */
        @Test
        @DisplayName("should_parse_put_method")
        void shouldParsePutMethod() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api updateApi = apiDefinition.getApis().get(2);

            // Then
            assertEquals(Api.HttpMethod.PUT, updateApi.getMethod());
        }

        /**
         * 测试场景：解析DELETE请求API
         * 预期结果：HTTP方法正确解析为DELETE
         * 实际结果：method为Api.HttpMethod.DELETE
         */
        @Test
        @DisplayName("should_parse_delete_method")
        void shouldParseDeleteMethod() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api deleteApi = apiDefinition.getApis().get(4);

            // Then
            assertEquals(Api.HttpMethod.DELETE, deleteApi.getMethod());
        }
    }

    @Nested
    @DisplayName("should_parse_request_and_response")
    class ShouldParseRequestAndResponse {

        /**
         * 测试场景：解析Request类定义
         * 预期结果：className和fields被正确解析
         * 实际结果：CreateUserReq包含12个字段
         */
        @Test
        @DisplayName("should_parse_request_class_definition")
        void shouldParseRequestClassDefinition() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            ClassDefinition request = createUserApi.getRequest();

            // Then
            assertNotNull(request);
            assertEquals("CreateUserReq", request.getClassName());
            assertEquals(12, request.getFields().size());
        }

        /**
         * 测试场景：解析Response类定义
         * 预期结果：className和fields被正确解析
         * 实际结果：CreateUserRsp包含3个字段
         */
        @Test
        @DisplayName("should_parse_response_class_definition")
        void shouldParseResponseClassDefinition() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            ClassDefinition response = createUserApi.getResponse();

            // Then
            assertNotNull(response);
            assertEquals("CreateUserRsp", response.getClassName());
            assertEquals(3, response.getFields().size());
        }
    }

    @Nested
    @DisplayName("should_parse_all_field_types")
    class ShouldParseAllFieldTypes {

        /**
         * 测试场景：解析所有基本类型字段
         * 预期结果：String、Integer、Long、Double、Boolean类型被正确解析
         * 实际结果：各字段的type属性与定义一致
         */
        @Test
        @DisplayName("should_parse_primitive_types")
        void shouldParsePrimitiveTypes() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> requestFields = createUserApi.getRequest().getFields();
            List<FieldDefinition> responseFields = createUserApi.getResponse().getFields();

            // Then
            assertEquals("String", getFieldByName(requestFields, "username").getType());
            assertEquals("Integer", getFieldByName(requestFields, "age").getType());
            assertEquals("Long", getFieldByName(responseFields, "userId").getType());
            assertEquals("Double", getFieldByName(requestFields, "balance").getType());
            assertEquals("Boolean", getFieldByName(requestFields, "isActive").getType());
        }

        /**
         * 测试场景：解析日期时间类型字段
         * 预期结果：LocalDate、LocalDateTime类型被正确解析
         * 实际结果：日期类型字段的type属性正确
         */
        @Test
        @DisplayName("should_parse_date_types")
        void shouldParseDateTypes() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> fields = createUserApi.getRequest().getFields();

            // Then
            assertEquals("LocalDate", getFieldByName(fields, "birthDate").getType());
            assertEquals("LocalDate", getFieldByName(fields, "expireDate").getType());
            assertEquals("LocalDateTime", getFieldByName(fields, "createTime").getType());
        }

        /**
         * 测试场景：解析List类型字段
         * 预期结果：List<String>、List<Long>、List<Address>类型被正确解析
         * 实际结果：List类型的泛型信息被保留
         */
        @Test
        @DisplayName("should_parse_list_types")
        void shouldParseListTypes() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> fields = createUserApi.getRequest().getFields();
            Api batchApi = apiDefinition.getApis().get(3);
            List<FieldDefinition> batchResponseFields = batchApi.getResponse().getFields();

            // Then
            assertEquals("List<String>", getFieldByName(fields, "tags").getType());
            assertEquals("List<Address>", getFieldByName(fields, "addresses").getType());
            assertEquals("List<Long>", getFieldByName(batchResponseFields, "orderIds").getType());
        }

        /**
         * 测试场景：解析Enum类型字段
         * 预期结果：Enum类型和enumValues被正确解析
         * 实际结果：isEnumType()返回true，enumValues包含预期值
         */
        @Test
        @DisplayName("should_parse_enum_type")
        void shouldParseEnumType() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> fields = createUserApi.getRequest().getFields();
            FieldDefinition roleField = getFieldByName(fields, "role");

            // Then
            assertEquals("Enum", roleField.getType());
            assertTrue(roleField.isEnumType());
            assertNotNull(roleField.getEnumValues());
            assertEquals(3, roleField.getEnumValues().size());
            assertEquals("ADMIN", roleField.getEnumValues().get(0));
            assertEquals("USER", roleField.getEnumValues().get(1));
            assertEquals("GUEST", roleField.getEnumValues().get(2));
        }

        /**
         * 测试场景：解析嵌套对象类型字段
         * 预期结果：自定义对象类型的fields被正确解析
         * 实际结果：嵌套对象包含子字段定义
         */
        @Test
        @DisplayName("should_parse_nested_object_type")
        void shouldParseNestedObjectType() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api updateApi = apiDefinition.getApis().get(2);
            List<FieldDefinition> fields = updateApi.getRequest().getFields();
            FieldDefinition profileField = getFieldByName(fields, "profile");

            // Then
            assertEquals("UserProfile", profileField.getType());
            assertTrue(profileField.isObjectType());
            assertNotNull(profileField.getFields());
            assertEquals(3, profileField.getFields().size());
        }
    }

    @Nested
    @DisplayName("should_parse_validation_config")
    class ShouldParseValidationConfig {

        /**
         * 测试场景：解析String类型的校验规则
         * 预期结果：minLength、maxLength、pattern、email被正确解析
         * 实际结果：ValidationConfig包含正确的校验值
         */
        @Test
        @DisplayName("should_parse_string_validation_rules")
        void shouldParseStringValidationRules() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> fields = createUserApi.getRequest().getFields();
            FieldDefinition usernameField = getFieldByName(fields, "username");
            FieldDefinition emailField = getFieldByName(fields, "email");

            // Then
            ValidationConfig usernameValidation = usernameField.getValidation();
            assertNotNull(usernameValidation);
            assertEquals(4, usernameValidation.getMinLength());
            assertEquals(20, usernameValidation.getMaxLength());
            assertEquals("^[a-zA-Z0-9_]+$", usernameValidation.getPattern());

            ValidationConfig emailValidation = emailField.getValidation();
            assertNotNull(emailValidation);
            assertTrue(emailValidation.getEmail());
        }

        /**
         * 测试场景：解析数值类型的校验规则
         * 预期结果：min、max被正确解析
         * 实际结果：ValidationConfig包含正确的数值范围
         */
        @Test
        @DisplayName("should_parse_numeric_validation_rules")
        void shouldParseNumericValidationRules() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> fields = createUserApi.getRequest().getFields();
            FieldDefinition ageField = getFieldByName(fields, "age");
            FieldDefinition balanceField = getFieldByName(fields, "balance");

            // Then
            ValidationConfig ageValidation = ageField.getValidation();
            assertNotNull(ageValidation);
            assertEquals(0.0, ageValidation.getMin());
            assertEquals(150.0, ageValidation.getMax());

            ValidationConfig balanceValidation = balanceField.getValidation();
            assertNotNull(balanceValidation);
            assertEquals(0.0, balanceValidation.getMin());
            assertEquals(1000000.0, balanceValidation.getMax());
        }

        /**
         * 测试场景：解析List类型的校验规则
         * 预期结果：minSize、maxSize被正确解析
         * 实际结果：ValidationConfig包含正确的大小范围
         */
        @Test
        @DisplayName("should_parse_list_validation_rules")
        void shouldParseListValidationRules() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> fields = createUserApi.getRequest().getFields();
            FieldDefinition tagsField = getFieldByName(fields, "tags");
            FieldDefinition addressesField = getFieldByName(fields, "addresses");

            // Then
            ValidationConfig tagsValidation = tagsField.getValidation();
            assertNotNull(tagsValidation);
            assertEquals(1, tagsValidation.getMinSize());
            assertEquals(10, tagsValidation.getMaxSize());

            ValidationConfig addressesValidation = addressesField.getValidation();
            assertNotNull(addressesValidation);
            assertEquals(1, addressesValidation.getMinSize());
            assertEquals(5, addressesValidation.getMaxSize());
        }

        /**
         * 测试场景：解析日期类型的校验规则
         * 预期结果：past、future被正确解析
         * 实际结果：ValidationConfig包含正确的日期校验标志
         */
        @Test
        @DisplayName("should_parse_date_validation_rules")
        void shouldParseDateValidationRules() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> fields = createUserApi.getRequest().getFields();
            FieldDefinition birthDateField = getFieldByName(fields, "birthDate");
            FieldDefinition expireDateField = getFieldByName(fields, "expireDate");

            // Then
            ValidationConfig birthValidation = birthDateField.getValidation();
            assertNotNull(birthValidation);
            assertTrue(birthValidation.getPast());
            assertNull(birthValidation.getFuture());

            ValidationConfig expireValidation = expireDateField.getValidation();
            assertNotNull(expireValidation);
            assertTrue(expireValidation.getFuture());
            assertNull(expireValidation.getPast());
        }

        /**
         * 测试场景：解析List元素类型的校验规则
         * 预期结果：elementValidation被正确解析
         * 实际结果：ElementValidationConfig包含正确的元素校验值
         */
        @Test
        @DisplayName("should_parse_element_validation")
        void shouldParseElementValidation() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> fields = createUserApi.getRequest().getFields();
            FieldDefinition addressesField = getFieldByName(fields, "addresses");

            // Then
            ValidationConfig addressesValidation = addressesField.getValidation();
            assertNotNull(addressesValidation);
            ElementValidationConfig elementValidation = addressesValidation.getElementValidation();
            assertNotNull(elementValidation);
            assertEquals(5, elementValidation.getMinLength());
            assertEquals(100, elementValidation.getMaxLength());
        }
    }

    @Nested
    @DisplayName("should_parse_field_attributes")
    class ShouldParseFieldAttributes {

        /**
         * 测试场景：解析required属性
         * 预期结果：必填字段的required为true
         * 实际结果：username字段required为true，age字段required为false
         */
        @Test
        @DisplayName("should_parse_required_attribute")
        void shouldParseRequiredAttribute() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> fields = createUserApi.getRequest().getFields();

            // Then
            assertTrue(getFieldByName(fields, "username").isRequired());
            assertFalse(getFieldByName(fields, "age").isRequired());
        }

        /**
         * 测试场景：解析description属性
         * 预期结果：description被正确解析
         * 实际结果：各字段的description与定义一致
         */
        @Test
        @DisplayName("should_parse_description_attribute")
        void shouldParseDescriptionAttribute() throws IOException {
            // Given
            File yamlFile = new File(TEST_YAML_DIR, "valid-all-types.yaml");

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlFile);
            Api createUserApi = apiDefinition.getApis().get(0);
            List<FieldDefinition> requestFields = createUserApi.getRequest().getFields();
            List<FieldDefinition> responseFields = createUserApi.getResponse().getFields();

            // Then
            assertEquals("用户名", getFieldByName(requestFields, "username").getDescription());
            assertEquals("用户ID", getFieldByName(responseFields, "userId").getDescription());
        }
    }

    @Nested
    @DisplayName("should_handle_null_and_empty_cases")
    class ShouldHandleNullAndEmptyCases {

        /**
         * 测试场景：解析没有request的API
         * 预期结果：API列表能正常解析
         * 实际结果：返回一个API定义
         */
        @Test
        @DisplayName("should_handle_null_request")
        void shouldHandleNullRequest() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: noRequestApi
                    path: /api/no-request
                    method: GET
                    description: No request API
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // Then
            assertNotNull(apiDefinition.getApis());
            assertEquals(1, apiDefinition.getApis().size());
        }

        /**
         * 测试场景：解析没有response的API
         * 预期结果：API列表能正常解析
         * 实际结果：返回一个API定义
         */
        @Test
        @DisplayName("should_handle_null_response")
        void shouldHandleNullResponse() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: noResponseApi
                    path: /api/no-response
                    method: POST
                    description: No response API
                    request:
                      className: TestReq
                      fields:
                        - name: field1
                          type: String
                          required: true
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // Then
            assertNotNull(apiDefinition.getApis());
            assertEquals(1, apiDefinition.getApis().size());
        }

        /**
         * 测试场景：解析没有validation的字段
         * 预期结果：validation为null
         * 实际结果：validation字段为null
         */
        @Test
        @DisplayName("should_handle_null_validation")
        void shouldHandleNullValidation() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: noValidationApi
                    path: /api/no-validation
                    method: POST
                    description: No validation API
                    request:
                      className: TestReq
                      fields:
                        - name: field1
                          type: String
                          required: false
                    response:
                      className: TestRsp
                      fields:
                        - name: result
                          type: Boolean
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);
            FieldDefinition field = apiDefinition.getApis().get(0).getRequest().getFields().get(0);

            // Then
            assertNull(field.getValidation());
        }

        /**
         * 测试场景：解析没有嵌套fields的字段
         * 预期结果：fields为null或空列表
         * 实际结果：基本类型字段的fields为null
         */
        @Test
        @DisplayName("should_handle_null_fields")
        void shouldHandleNullFields() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: nullFieldsApi
                    path: /api/null-fields
                    method: POST
                    description: Null fields API
                    request:
                      className: TestReq
                      fields:
                        - name: field1
                          type: String
                          required: true
                    response:
                      className: TestRsp
                      fields:
                        - name: result
                          type: Boolean
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);
            FieldDefinition field = apiDefinition.getApis().get(0).getRequest().getFields().get(0);

            // Then
            assertNull(field.getFields());
        }
    }

    @Nested
    @DisplayName("should_throw_exception_for_invalid_input")
    class ShouldThrowExceptionForInvalidInput {

        /**
         * 测试场景：解析不存在的文件
         * 预期结果：抛出IOException
         * 实际结果：FileNotFoundException或IOException
         */
        @Test
        @DisplayName("should_throw_exception_for_nonexistent_file")
        void shouldThrowExceptionForNonexistentFile() {
            // Given
            File nonexistentFile = new File(TEST_YAML_DIR, "nonexistent.yaml");

            // When & Then
            assertThrows(IOException.class, () -> YamlParser.parse(nonexistentFile));
        }

        /**
         * 测试场景：解析无效的YAML内容（重复键等）
         * 预期结果：可以正确解析（Jackson处理重复键的方式）
         * 实际结果：返回有效的ApiDefinition
         *
         * 注意：对于YAML解析，只要语法正确就不会抛出异常。
         * 验证逻辑应该在ApiValidator中处理。
         */
        @Test
        @DisplayName("should_parse_yaml_with_missing_name_field")
        void shouldHandleMissingNameField() throws IOException {
            // Given - YAML中fields缺少name，这在YAML语法上是有效的
            String yamlContent = """
                apis:
                  - name: testApi
                    path: /api/test
                    method: POST
                    request:
                      className: TestReq
                      fields:
                        - type: String
                    response:
                      className: TestRsp
                      fields:
                        - name: result
                          type: Boolean
                """;

            // When - YAML解析应该成功（语法正确）
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // Then
            assertNotNull(apiDefinition);
            assertEquals(1, apiDefinition.getApis().size());
        }
    }

    /**
     * 辅助方法：根据字段名获取字段定义
     */
    private FieldDefinition getFieldByName(List<FieldDefinition> fields, String name) {
        return fields.stream()
            .filter(f -> name.equals(f.getName()))
            .findFirst()
            .orElseThrow(() -> new AssertionError("Field not found: " + name));
    }
}
