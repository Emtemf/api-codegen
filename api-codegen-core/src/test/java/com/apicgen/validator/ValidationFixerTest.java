package com.apicgen.validator;

import com.apicgen.model.ApiDefinition;
import com.apicgen.model.FieldDefinition;
import com.apicgen.parser.YamlParser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ValidationFixer 单元测试
 *
 * 测试场景：
 * - 自动修复必填校验
 * - 自动修复 String 字段校验
 * - 自动修复数值字段校验
 * - 自动修复 List 字段校验
 * - 自动修复日期字段校验
 * - 智能识别并修复（邮箱、电话等）
 */
class ValidationFixerTest {

    private final ValidationFixer fixer = new ValidationFixer();

    @Nested
    @DisplayName("should_fix_required_validation")
    class ShouldFixRequiredValidation {

        /**
         * 测试场景：必填字段添加 @NotNull 建议
         * 预期结果：问题被标记，但fixer提供建议
         * 实际结果：fixer.fix()返回修复后的YAML
         */
        @Test
        @DisplayName("should_fix_required_field_validation")
        void shouldFixRequiredFieldValidation() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: username
                          type: String
                          required: true
                          description: 用户名
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: userId
                          type: Long
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // 先分析问题
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);

            // When
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml, "修复后的YAML不应为空");
            assertTrue(fixedYaml.contains("validation:"), "应包含validation配置");
        }
    }

    @Nested
    @DisplayName("should_fix_string_validation")
    class ShouldFixStringValidation {

        /**
         * 测试场景：String 字段添加 minLength 和 maxLength
         * 预期结果：修复后的 YAML 包含长度校验
         * 实际结果：fixedYaml 包含 minLength 和 maxLength
         */
        @Test
        @DisplayName("should_add_length_validation_for_string")
        void shouldAddLengthValidationForString() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: username
                          type: String
                          required: false
                          description: 用户名
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("minLength:"), "应添加minLength");
            assertTrue(fixedYaml.contains("maxLength:"), "应添加maxLength");
        }

        /**
         * 测试场景：邮箱字段自动添加 email 校验
         * 预期结果：修复后的 YAML 包含 email: true
         * 实际结果：fixedYaml 包含 email: true
         */
        @Test
        @DisplayName("should_add_email_validation_for_email_field")
        void shouldAddEmailValidationForEmailField() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: userEmail
                          type: String
                          required: false
                          description: 邮箱
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("email:"), "应添加email校验");
        }

        /**
         * 测试场景：电话字段自动添加正则校验
         * 预期结果：修复后的 YAML 包含 pattern
         * 实际结果：fixedYaml 包含手机号正则
         */
        @Test
        @DisplayName("should_add_pattern_for_phone_field")
        void shouldAddPatternForPhoneField() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: phoneNumber
                          type: String
                          required: false
                          description: 电话
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("pattern:"), "应添加pattern校验");
        }
    }

    @Nested
    @DisplayName("should_fix_numeric_validation")
    class ShouldFixNumericValidation {

        /**
         * 测试场景：Integer 字段添加 min 和 max
         * 预期结果：修复后的 YAML 包含范围校验
         * 实际结果：fixedYaml 包含 min: 0 和 max: 2147483647
         */
        @Test
        @DisplayName("should_add_range_for_integer")
        void shouldAddRangeForInteger() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: age
                          type: Integer
                          required: false
                          description: 年龄
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("min:"), "应添加min");
            assertTrue(fixedYaml.contains("max:"), "应添加max");
        }

        /**
         * 测试场景：page 字段添加 min=1, max=2147483647
         * 预期结果：修复后的 YAML 包含页码范围校验
         * 实际结果：fixedYaml 包含 min: 1 和 max: 2147483647
         */
        @Test
        @DisplayName("should_add_range_for_page_field")
        void shouldAddRangeForPageField() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: queryUsers
                    path: /api/users
                    method: GET
                    request:
                      className: QueryUsersReq
                      fields:
                        - name: page
                          type: Integer
                          required: false
                          description: 页码
                    response:
                      className: QueryUsersRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("min: 1"), "页码字段应添加min: 1");
            // Double类型序列化为科学计数法，检查是否包含 2147483647 或 2.147483647E9
            assertTrue(fixedYaml.contains("2147483647") || fixedYaml.contains("2.147483647E9"), "页码字段应添加max");
        }

        /**
         * 测试场景：pageNum 字段添加 min=1, max=2147483647
         * 预期结果：修复后的 YAML 包含页码范围校验
         * 实际结果：fixedYaml 包含 min: 1 和 max: 2147483647
         */
        @Test
        @DisplayName("should_add_range_for_pageNum_field")
        void shouldAddRangeForPageNumField() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: queryUsers
                    path: /api/users
                    method: GET
                    request:
                      className: QueryUsersReq
                      fields:
                        - name: pageNum
                          type: Integer
                          required: false
                          description: 页码
                    response:
                      className: QueryUsersRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("min: 1"), "页码字段应添加min: 1");
            // Double类型序列化为科学计数法，检查是否包含 2147483647 或 2.147483647E9
            assertTrue(fixedYaml.contains("2147483647") || fixedYaml.contains("2.147483647E9"), "页码字段应添加max");
        }

        /**
         * 测试场景：pageSize 字段添加 min=1, max=100
         * 预期结果：修复后的 YAML 包含每页数量范围校验
         * 实际结果：fixedYaml 包含 min: 1 和 max: 100
         */
        @Test
        @DisplayName("should_add_range_for_pageSize_field")
        void shouldAddRangeForPageSizeField() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: queryUsers
                    path: /api/users
                    method: GET
                    request:
                      className: QueryUsersReq
                      fields:
                        - name: pageSize
                          type: Integer
                          required: false
                          description: 每页数量
                    response:
                      className: QueryUsersRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("min: 1"), "每页数量字段应添加min: 1");
            assertTrue(fixedYaml.contains("max: 100"), "每页数量字段应添加max: 100");
        }

        /**
         * 测试场景：limit 字段添加 min=1, max=100
         * 预期结果：修复后的 YAML 包含限制范围校验
         * 实际结果：fixedYaml 包含 min: 1 和 max: 100
         */
        @Test
        @DisplayName("should_add_range_for_limit_field")
        void shouldAddRangeForLimitField() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: queryUsers
                    path: /api/users
                    method: GET
                    request:
                      className: QueryUsersReq
                      fields:
                        - name: limit
                          type: Integer
                          required: false
                          description: 限制数量
                    response:
                      className: QueryUsersRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("min: 1"), "限制字段应添加min: 1");
            assertTrue(fixedYaml.contains("max: 100"), "限制字段应添加max: 100");
        }

        /**
         * 测试场景：size 字段添加 min=1, max=100
         * 预期结果：修复后的 YAML 包含大小范围校验
         * 实际结果：fixedYaml 包含 min: 1 和 max: 100
         */
        @Test
        @DisplayName("should_add_range_for_size_field")
        void shouldAddRangeForSizeField() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: queryUsers
                    path: /api/users
                    method: GET
                    request:
                      className: QueryUsersReq
                      fields:
                        - name: size
                          type: Integer
                          required: false
                          description: 大小
                    response:
                      className: QueryUsersRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("min: 1"), "大小字段应添加min: 1");
            assertTrue(fixedYaml.contains("max: 100"), "大小字段应添加max: 100");
        }

        /**
         * 测试场景：Long 字段添加 min 和 max
         * 预期结果：修复后的 YAML 包含范围校验
         * 实际结果：fixedYaml 包含正确的Long范围
         */
        @Test
        @DisplayName("should_add_range_for_long")
        void shouldAddRangeForLong() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: userId
                          type: Long
                          required: false
                          description: 用户ID
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("min:"), "应添加min");
            assertTrue(fixedYaml.contains("max:"), "应添加max");
        }

        /**
         * 测试场景：路径参数（Integer类型）添加 min=1
         * 预期结果：修复后的 YAML 包含路径参数校验
         * 实际结果：fixedYaml 包含 min: 1
         */
        @Test
        @DisplayName("should_add_min_for_path_param_integer")
        void shouldAddMinForPathParamInteger() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: getUser
                    path: /api/users/{id}
                    method: GET
                    request:
                      className: GetUserReq
                      fields:
                        - name: id
                          type: Integer
                          in: path
                          required: true
                          description: 用户ID
                    response:
                      className: GetUserRsp
                      fields:
                        - name: userId
                          type: Long
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("min: 1"), "路径参数应添加min: 1");
        }

        /**
         * 测试场景：路径参数（String类型）添加 minLength=1
         * 预期结果：修复后的 YAML 包含路径参数校验
         * 实际结果：fixedYaml 包含 minLength: 1
         */
        @Test
        @DisplayName("should_add_minLength_for_path_param_string")
        void shouldAddMinLengthForPathParamString() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: getUserByCode
                    path: /api/users/{userCode}
                    method: GET
                    request:
                      className: GetUserByCodeReq
                      fields:
                        - name: userCode
                          type: String
                          in: path
                          required: true
                          description: 用户编码
                    response:
                      className: GetUserByCodeRsp
                      fields:
                        - name: userId
                          type: Long
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("minLength: 1"), "路径参数应添加minLength: 1");
        }
    }

    @Nested
    @DisplayName("should_fix_list_validation")
    class ShouldFixListValidation {

        /**
         * 测试场景：List 字段添加 minSize 和 maxSize
         * 预期结果：修复后的 YAML 包含大小校验
         * 实际结果：fixedYaml 包含 minSize: 1 和 maxSize: 100
         */
        @Test
        @DisplayName("should_add_size_for_list")
        void shouldAddSizeForList() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: tags
                          type: List<String>
                          required: false
                          description: 标签列表
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("minSize:"), "应添加minSize");
            assertTrue(fixedYaml.contains("maxSize:"), "应添加maxSize");
        }

        /**
         * 测试场景：多个 List 类型字段
         * 预期结果：所有 List 字段都添加大小校验
         * 实际结果：fixedYaml 包含多个 minSize/maxSize
         */
        @Test
        @DisplayName("should_fix_multiple_list_fields")
        void shouldFixMultipleListFields() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: tags
                          type: List<String>
                          required: false
                          description: 标签
                        - name: orderIds
                          type: List<Long>
                          required: false
                          description: 订单ID
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            long count = fixedYaml.split("minSize:").length - 1;
            assertTrue(count >= 2, "两个List字段都应添加minSize校验");
        }
    }

    @Nested
    @DisplayName("should_fix_date_validation")
    class ShouldFixDateValidation {

        /**
         * 测试场景：生日字段自动添加 past 校验
         * 预期结果：修复后的 YAML 包含 past: true
         * 实际结果：fixedYaml 包含 past: true
         */
        @Test
        @DisplayName("should_add_past_for_birth_field")
        void shouldAddPastForBirthField() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: birthDate
                          type: LocalDate
                          required: false
                          description: 生日
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("past:"), "应添加past校验");
        }

        /**
         * 测试场景：预约字段自动添加 future 校验
         * 预期结果：修复后的 YAML 包含 future: true
         * 实际结果：fixedYaml 包含 future: true
         */
        @Test
        @DisplayName("should_add_future_for_schedule_field")
        void shouldAddFutureForScheduleField() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: appointmentDate
                          type: LocalDate
                          required: false
                          description: 预约日期
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("future:"), "应添加future校验");
        }
    }

    @Nested
    @DisplayName("should_preserve_existing_validation")
    class ShouldPreserveExistingValidation {

        /**
         * 测试场景：已有校验的字段保留原值
         * 预期结果：修复不覆盖已有的有效校验
         * 实际结果：fixedYaml 保留原有的 minLength
         */
        @Test
        @DisplayName("should_preserve_existing_validation_values")
        void shouldPreserveExistingValidationValues() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: username
                          type: String
                          required: false
                          description: 用户名
                          validation:
                            minLength: 10
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(fixedYaml.contains("minLength: 10"), "应保留原有的minLength值");
            assertTrue(fixedYaml.contains("maxLength: 255"), "应添加maxLength");
        }
    }

    @Nested
    @DisplayName("should_fix_complex_api")
    class ShouldFixComplexApi {

        /**
         * 测试场景：复杂 API（多个字段类型）
         * 预期结果：所有问题字段都被修复
         * 实际结果：fixedYaml 包含所有必要的校验配置
         */
        @Test
        @DisplayName("should_fix_complex_api_with_multiple_field_types")
        void shouldFixComplexApiWithMultipleFieldTypes() throws IOException {
            // Given
            String yamlContent = """
                apis:
                  - name: createUser
                    path: /api/users
                    method: POST
                    request:
                      className: CreateUserReq
                      fields:
                        - name: username
                          type: String
                          required: true
                          description: 用户名
                        - name: email
                          type: String
                          required: true
                          description: 邮箱
                        - name: age
                          type: Integer
                          required: false
                          description: 年龄
                        - name: tags
                          type: List<String>
                          required: false
                          description: 标签
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: userId
                          type: Long
                          description: 用户ID
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer analyzer = new ValidationAnalyzer();
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            String fixedYaml = fixer.fix(apiDefinition, issues);

            // Then
            assertNotNull(fixedYaml);
            assertTrue(summary.getTotalCount() > 0, "应有多个问题待修复");
            assertTrue(fixedYaml.contains("validation:"), "应包含validation配置");
            // 验证数值已修复（不再检测到问题）
            ValidationAnalyzer analyzer2 = new ValidationAnalyzer();
            ApiDefinition fixedDef = YamlParser.parse(fixedYaml);
            ValidationAnalyzer.AnalysisSummary summary2 = analyzer2.summarize(fixedDef);
            assertTrue(summary2.getWarningCount() < summary.getWarningCount(), "警告数量应减少");
        }
    }
}
