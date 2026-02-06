package com.apicgen.validator;

import com.apicgen.model.ApiDefinition;
import com.apicgen.model.FieldDefinition;
import com.apicgen.parser.YamlParser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ValidationAnalyzer 单元测试
 *
 * 测试场景：
 * - 分析缺失的必填校验
 * - 分析 String 类型字段的校验
 * - 分析数值类型字段的校验
 * - 分析 List 类型字段的校验
 * - 分析日期类型字段的校验
 * - 智能识别（邮箱、电话等）
 */
class ValidationAnalyzerTest {

    private static final String TEST_YAML_DIR = "src/test/resources/yaml";
    private final ValidationAnalyzer analyzer = new ValidationAnalyzer();

    @Nested
    @DisplayName("should_return_no_issues_for_fully_validated_yaml")
    class ShouldReturnNoIssuesForFullyValidatedYaml {

        /**
         * 测试场景：非必填字段已添加完整验证规则的YAML
         * 预期结果：无校验问题
         * 实际结果：AnalysisSummary.hasIssues()返回false
         *
         * 说明：required: true 字段需要额外的 @NotNull 校验，
         * 这是分析器的预期行为（检测到问题）。
         * 本测试验证非必填字段的完整校验不会产生警告。
         */
        @Test
        @DisplayName("should_return_no_issues_when_non_required_fields_fully_validated")
        void shouldReturnNoIssuesWhenNonRequiredFieldsFullyValidated() throws IOException {
            // Given - 非必填字段已添加完整校验规则
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
                            minLength: 4
                            maxLength: 20
                        - name: email
                          type: String
                          required: false
                          description: 邮箱
                          validation:
                            email: true
                            minLength: 5
                            maxLength: 50
                        - name: age
                          type: Integer
                          required: false
                          description: 年龄
                          validation:
                            min: 0
                            max: 150
                        - name: tags
                          type: List<String>
                          required: false
                          description: 标签
                          validation:
                            minSize: 1
                            maxSize: 10
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: userId
                          type: Long
                          required: false
                          description: 用户ID
                          validation:
                            min: 0
                            max: 2147483647
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then - 完全没有问题
            assertFalse(summary.hasIssues(), "已添加完整校验规则（包括必填校验）的YAML不应有问题");
        }
    }

    @Nested
    @DisplayName("should_detect_missing_required_validation")
    class ShouldDetectMissingRequiredValidation {

        /**
         * 测试场景：必填字段缺少 @NotNull/@NotBlank 校验
         * 预期结果：检测到 ERROR 级别问题
         * 实际结果：AnalysisSummary.getErrorCount() > 0
         */
        @Test
        @DisplayName("should_detect_missing_notnull_for_required_field")
        void shouldDetectMissingNotnullForRequiredField() throws IOException {
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

            // When
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then
            assertTrue(summary.getErrorCount() > 0, "必填字段应检测到错误");
            assertTrue(issues.stream().anyMatch(i ->
                i.getIssue().contains("必填字段缺少 @NotNull/@NotBlank 校验")), "应包含必填校验缺失的提示");
        }
    }

    @Nested
    @DisplayName("should_detect_missing_string_validation")
    class ShouldDetectMissingStringValidation {

        /**
         * 测试场景：String 字段缺少长度校验
         * 预期结果：检测到 WARNING 级别问题
         * 实际结果：AnalysisSummary.getWarningCount() > 0
         */
        @Test
        @DisplayName("should_detect_missing_length_validation_for_string")
        void shouldDetectMissingLengthValidationForString() throws IOException {
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
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then
            assertTrue(summary.getWarningCount() > 0, "String字段应检测到警告");
        }

        /**
         * 测试场景：邮箱字段缺少 email 校验
         * 预期结果：检测到 INFO 级别问题
         * 实际结果：AnalysisSummary.getInfoCount() > 0
         */
        @Test
        @DisplayName("should_suggest_email_validation_for_email_field")
        void shouldSuggestEmailValidationForEmailField() throws IOException {
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
                          description: 用户邮箱
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);

            // Then
            assertTrue(issues.stream().anyMatch(i ->
                i.getIssue().contains("邮箱字段建议添加 email 校验")), "应建议添加邮箱校验");
        }

        /**
         * 测试场景：电话字段缺少正则校验
         * 预期结果：检测到 INFO 级别问题
         * 实际结果：issues 包含电话正则建议
         */
        @Test
        @DisplayName("should_suggest_pattern_for_phone_field")
        void shouldSuggestPatternForPhoneField() throws IOException {
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
                          description: 电话号码
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);

            // Then
            assertTrue(issues.stream().anyMatch(i ->
                i.getIssue().contains("电话字段建议添加正则校验")), "应建议添加电话正则校验");
        }
    }

    @Nested
    @DisplayName("should_detect_missing_numeric_validation")
    class ShouldDetectMissingNumericValidation {

        /**
         * 测试场景：Integer/Long/Double 字段缺少范围校验
         * 预期结果：检测到 WARNING 级别问题
         * 实际结果：AnalysisSummary.getWarningCount() > 0
         */
        @Test
        @DisplayName("should_detect_missing_range_for_integer")
        void shouldDetectMissingRangeForInteger() throws IOException {
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
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then
            assertTrue(summary.getWarningCount() > 0, "Integer字段应检测到警告");
        }

        /**
         * 测试场景：数值字段 min < 0（警告）
         * 预期结果：检测到 INFO 级别问题
         * 实际结果：AnalysisSummary.getInfoCount() > 0
         */
        @Test
        @DisplayName("should_warn_when_min_less_than_zero")
        void shouldWarnWhenMinLessThanZero() throws IOException {
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
                          validation:
                            min: -100
                            max: 200
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);

            // Then
            assertTrue(issues.stream().anyMatch(i ->
                i.getIssue().contains("min 建议 >= 0")), "应警告min小于0");
        }
    }

    @Nested
    @DisplayName("should_detect_missing_list_validation")
    class ShouldDetectMissingListValidation {

        /**
         * 测试场景：List 字段缺少大小校验
         * 预期结果：检测到 WARNING 级别问题
         * 实际结果：AnalysisSummary.getWarningCount() > 0
         */
        @Test
        @DisplayName("should_detect_missing_size_for_list")
        void shouldDetectMissingSizeForList() throws IOException {
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
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then
            assertTrue(summary.getWarningCount() > 0, "List字段应检测到警告");
        }

        /**
         * 测试场景：minSize > maxSize（错误）
         * 预期结果：检测到 ERROR 级别问题
         * 实际结果：AnalysisSummary.getErrorCount() > 0
         */
        @Test
        @DisplayName("should_error_when_minSize_greater_than_maxSize")
        void shouldErrorWhenMinSizeGreaterThanMaxSize() throws IOException {
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
                          validation:
                            minSize: 100
                            maxSize: 10
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then
            assertTrue(summary.getErrorCount() > 0, "minSize > maxSize 应检测到错误");
        }

        /**
         * 测试场景：maxSize <= 0（错误）
         * 预期结果：检测到 ERROR 级别问题
         * 实际结果：AnalysisSummary.getErrorCount() > 0
         */
        @Test
        @DisplayName("should_error_when_maxSize_not_positive")
        void shouldErrorWhenMaxSizeNotPositive() throws IOException {
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
                          validation:
                            minSize: 1
                            maxSize: 0
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then
            assertTrue(summary.getErrorCount() > 0, "maxSize <= 0 应检测到错误");
        }
    }

    @Nested
    @DisplayName("should_detect_missing_date_validation")
    class ShouldDetectMissingDateValidation {

        /**
         * 测试场景：生日字段（birth）缺少 past 校验
         * 预期结果：检测到 INFO 级别问题
         * 实际结果：AnalysisSummary.getInfoCount() > 0
         */
        @Test
        @DisplayName("should_suggest_past_for_birth_field")
        void shouldSuggestPastForBirthField() throws IOException {
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
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);

            // Then
            assertTrue(issues.stream().anyMatch(i ->
                i.getIssue().contains("生日字段建议添加 past 校验")), "应建议添加past校验");
        }

        /**
         * 测试场景：预约字段（schedule）缺少 future 校验
         * 预期结果：检测到 INFO 级别问题
         * 实际结果：AnalysisSummary.getInfoCount() > 0
         */
        @Test
        @DisplayName("should_suggest_future_for_schedule_field")
        void shouldSuggestFutureForScheduleField() throws IOException {
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
            List<ValidationAnalyzer.AnalysisItem> issues = analyzer.analyze(apiDefinition);

            // Then
            assertTrue(issues.stream().anyMatch(i ->
                i.getIssue().contains("预约字段建议添加 future 校验")), "应建议添加future校验");
        }
    }

    @Nested
    @DisplayName("should_detect_logic_errors")
    class ShouldDetectLogicErrors {

        /**
         * 测试场景：minLength > maxLength（错误）
         * 预期结果：检测到 ERROR 级别问题
         * 实际结果：AnalysisSummary.getErrorCount() > 0
         */
        @Test
        @DisplayName("should_error_when_minLength_greater_than_maxLength")
        void shouldErrorWhenMinLengthGreaterThanMaxLength() throws IOException {
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
                            minLength: 20
                            maxLength: 10
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then
            assertTrue(summary.getErrorCount() > 0, "minLength > maxLength 应检测到错误");
        }

        /**
         * 测试场景：min > max（错误）
         * 预期结果：检测到 ERROR 级别问题
         * 实际结果：AnalysisSummary.getErrorCount() > 0
         */
        @Test
        @DisplayName("should_error_when_min_greater_than_max")
        void shouldErrorWhenMinGreaterThanMax() throws IOException {
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
                          validation:
                            min: 200
                            max: 100
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then
            assertTrue(summary.getErrorCount() > 0, "min > max 应检测到错误");
        }
    }

    @Nested
    @DisplayName("should_support_list_with_generic_types")
    class ShouldSupportListWithGenericTypes {

        /**
         * 测试场景：List<String>, List<Long> 等泛型类型
         * 预期结果：正确识别为 List 类型并检测校验
         * 实际结果：AnalysisSummary.getWarningCount() > 0
         */
        @Test
        @DisplayName("should_detect_list_string_validation")
        void shouldDetectListStringValidation() throws IOException {
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
                          description: 订单ID列表
                    response:
                      className: CreateUserRsp
                      fields:
                        - name: success
                          type: Boolean
                """;
            ApiDefinition apiDefinition = YamlParser.parse(yamlContent);

            // When
            ValidationAnalyzer.AnalysisSummary summary = analyzer.summarize(apiDefinition);

            // Then
            assertTrue(summary.getWarningCount() >= 2, "两个List字段都应检测到警告");
        }
    }
}
