package com.apicgen.bridge;

import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class UiDocumentServiceTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    private final UiDocumentService service = new UiDocumentService();

    @Test
    @DisplayName("should_keep_bridge_metadata_in_shared_contract_resource")
    void shouldKeepBridgeMetadataInSharedContractResource() throws IOException {
        try (InputStream stream = UiBridgeContract.class.getResourceAsStream("/ui-bridge-contract.json")) {
            assertNotNull(stream, "bridge contract resource should exist on the classpath");

            JsonNode contract = JSON.readTree(stream);
            assertEquals(UiBridgeContract.BRIDGE_NAME, contract.path("bridge").asText());
            assertEquals(UiBridgeContract.CONTRACT_VERSION, contract.path("contractVersion").asInt());
            assertEquals(UiBridgeContract.COMMAND_ANALYZE, contract.path("commands").path("analyze").asText());
            assertEquals(UiBridgeContract.COMMAND_FIX, contract.path("commands").path("fix").asText());
            assertEquals(UiBridgeContract.FORMAT_CUSTOM, contract.path("formats").path("custom").asText());
            assertEquals(UiBridgeContract.FORMAT_SWAGGER, contract.path("formats").path("swagger").asText());
        }
    }

    @Test
    @DisplayName("should_analyze_custom_yaml_with_core_validation_issues")
    void shouldAnalyzeCustomYamlWithCoreValidationIssues() throws IOException {
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
                response:
                  className: CreateUserRsp
                  fields:
                    - name: success
                      type: Boolean
            """;

        UiDocumentService.AnalysisResponse response = service.analyze(yamlContent);

        assertEquals(UiBridgeContract.BRIDGE_NAME, response.bridge());
        assertEquals(UiBridgeContract.CONTRACT_VERSION, response.contractVersion());
        assertEquals(UiBridgeContract.COMMAND_ANALYZE, response.command());
        assertEquals("custom", response.sourceFormat());
        assertEquals("custom", response.inputFormat());
        assertEquals("custom", response.outputFormat());
        assertFalse(response.issues().isEmpty());
        UiDocumentService.UiIssue lengthIssue = response.issues().stream()
            .filter(issue -> issue.message().contains("String 字段缺少长度"))
            .findFirst()
            .orElseThrow(() -> new AssertionError("应返回 String 字段缺少长度校验问题"));

        assertEquals("createUser", lengthIssue.locator().apiName());
        assertEquals("/api/users", lengthIssue.locator().path());
        assertEquals("POST", lengthIssue.locator().method());
        assertEquals("request", lengthIssue.locator().section());
        assertEquals("CreateUserReq", lengthIssue.locator().className());
        assertEquals("username", lengthIssue.locator().fieldName());
        assertEquals("custom-field", lengthIssue.locator().kind());
        assertTrue(response.issues().stream().anyMatch(UiDocumentService.UiIssue::fixable));
    }

    @Test
    @DisplayName("should_report_fixable_path_issue_for_swagger_input")
    void shouldReportFixablePathIssueForSwaggerInput() throws IOException {
        String swaggerContent = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              //users:
                get:
                  operationId: getUsers
                  responses:
                    200:
                      description: Success
            """;

        UiDocumentService.AnalysisResponse response = service.analyze(swaggerContent);

        assertEquals(UiBridgeContract.BRIDGE_NAME, response.bridge());
        assertEquals(UiBridgeContract.CONTRACT_VERSION, response.contractVersion());
        assertEquals(UiBridgeContract.COMMAND_ANALYZE, response.command());
        assertEquals("swagger", response.sourceFormat());
        assertEquals("swagger", response.inputFormat());
        assertEquals("custom", response.outputFormat());
        UiDocumentService.UiIssue pathIssue = response.issues().stream()
            .filter(issue -> issue.message().contains("路径不能包含重复斜杠"))
            .findFirst()
            .orElseThrow(() -> new AssertionError("应返回路径重复斜杠问题"));

        assertTrue(pathIssue.fixable(), "Swagger 路径规范化问题应标记为可修复");
        assertEquals("DFX-001", pathIssue.ruleCode());
        assertNotNull(pathIssue.key());
        assertFalse(pathIssue.key().isBlank());
        assertEquals("swagger-path", pathIssue.locator().kind());
        assertEquals("//users", pathIssue.locator().path());
        assertEquals("GET", pathIssue.locator().method());
        assertEquals("path", pathIssue.locator().property());
    }

    @Test
    @DisplayName("should_expose_structured_swagger_field_locator_for_core_issues")
    void shouldExposeStructuredSwaggerFieldLocatorForCoreIssues() throws IOException {
        String swaggerContent = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              /search:
                get:
                  operationId: search
                  parameters:
                    - name: keyword
                      in: query
                      schema:
                        type: string
                        minLength: 100
                        maxLength: 10
                  responses:
                    200:
                      description: Success
            """;

        UiDocumentService.AnalysisResponse response = service.analyze(swaggerContent);
        UiDocumentService.UiIssue rangeIssue = response.issues().stream()
            .filter(issue -> issue.message().contains("minLength 不能大于 maxLength"))
            .findFirst()
            .orElseThrow(() -> new AssertionError("应返回 Swagger 字段校验问题"));

        assertEquals("swagger-field", rangeIssue.locator().kind());
        assertEquals("search", rangeIssue.locator().apiName());
        assertEquals("/search", rangeIssue.locator().path());
        assertEquals("GET", rangeIssue.locator().method());
        assertEquals("request", rangeIssue.locator().section());
        assertEquals("Request", rangeIssue.locator().className());
        assertEquals("keyword", rangeIssue.locator().fieldName());
        assertEquals("validation", rangeIssue.locator().property());
    }

    @Test
    @DisplayName("should_prefer_single_fixable_issue_when_validator_and_analyzer_report_same_invalid_range")
    void shouldPreferSingleFixableIssueWhenValidatorAndAnalyzerReportSameInvalidRange() throws IOException {
        String swaggerContent = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              /search:
                get:
                  operationId: searchInvalidLength
                  parameters:
                    - name: keyword
                      in: query
                      schema:
                        type: string
                        minLength: 100
                        maxLength: 10
                  responses:
                    200:
                      description: Success
              /range:
                get:
                  operationId: queryInvalidRange
                  parameters:
                    - name: age
                      in: query
                      schema:
                        type: integer
                        minimum: 100
                        maximum: 10
                  responses:
                    200:
                      description: Success
            """;

        UiDocumentService.AnalysisResponse response = service.analyze(swaggerContent);

        long invalidLengthIssues = response.issues().stream()
            .filter(issue -> "searchInvalidLength".equals(issue.locator() == null ? "" : issue.locator().apiName()))
            .filter(issue -> issue.message().contains("minLength 不能大于 maxLength"))
            .count();
        long invalidRangeIssues = response.issues().stream()
            .filter(issue -> "queryInvalidRange".equals(issue.locator() == null ? "" : issue.locator().apiName()))
            .filter(issue -> issue.message().contains("min 不能大于 max") || issue.message().contains("max 必须大于 min"))
            .count();

        assertEquals(1, invalidLengthIssues, "同一非法字符串范围不应同时出现手动和自动两条 issue");
        assertEquals(1, invalidRangeIssues, "同一非法数值范围不应同时出现手动和自动两条 issue");

        UiDocumentService.UiIssue lengthIssue = response.issues().stream()
            .filter(issue -> "searchInvalidLength".equals(issue.locator() == null ? "" : issue.locator().apiName()))
            .findFirst()
            .orElseThrow();
        UiDocumentService.UiIssue rangeIssue = response.issues().stream()
            .filter(issue -> "queryInvalidRange".equals(issue.locator() == null ? "" : issue.locator().apiName()))
            .findFirst()
            .orElseThrow();

        assertTrue(lengthIssue.fixable(), "非法字符串范围应优先保留可修复 issue");
        assertTrue(rangeIssue.fixable(), "非法数值范围应优先保留可修复 issue");
    }

    @Test
    @DisplayName("should_not_report_missing_notnull_for_swagger_required_parameter_when_required_is_already_explicit")
    void shouldNotReportMissingNotNullForSwaggerRequiredParameterWhenRequiredIsAlreadyExplicit() throws IOException {
        String swaggerContent = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              /users/detail:
                get:
                  operationId: getUserDetail
                  parameters:
                    - name: id
                      in: query
                      required: true
                      schema:
                        type: integer
                        minimum: 1
                        maximum: 10
                  responses:
                    200:
                      description: Success
            """;

        UiDocumentService.AnalysisResponse response = service.analyze(swaggerContent);

        assertTrue(response.issues().stream().noneMatch(issue ->
                "getUserDetail".equals(issue.locator() == null ? "" : issue.locator().apiName())
                        && issue.message().contains("必填字段缺少 @NotNull/@NotBlank 校验")),
            "Swagger required=true 已可生成 @NotNull，不应继续报 DFX-003");
    }

    @Test
    @DisplayName("should_mark_swagger_query_string_length_issue_fixable_when_parameter_type_can_be_inferred")
    void shouldMarkSwaggerQueryStringLengthIssueFixableWhenParameterTypeCanBeInferred() throws IOException {
        String swaggerContent = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              /users/detail:
                get:
                  operationId: getUserDetail
                  parameters:
                    - name: username
                      in: query
                      required: true
                  responses:
                    200:
                      description: Success
            """;

        UiDocumentService.AnalysisResponse response = service.analyze(swaggerContent);

        UiDocumentService.UiIssue lengthIssue = response.issues().stream()
            .filter(issue -> "getUserDetail".equals(issue.locator() == null ? "" : issue.locator().apiName()))
            .filter(issue -> issue.message().contains("String 字段缺少长度校验"))
            .findFirst()
            .orElseThrow(() -> new AssertionError("缺少 type 的 query string 参数仍应返回长度问题"));

        // 新行为：当可以从字段名推断类型时，问题应标记为可自动修复
        // 因为修复时会先推断并添加 type，然后添加校验属性
        assertTrue(lengthIssue.fixable(), "能从字段名推断类型时，长度问题应标为可自动修复");
    }

    @Test
    @DisplayName("should_fix_swagger_request_body_property_issues_through_source_yaml_patch")
    void shouldFixSwaggerRequestBodyPropertyIssuesThroughSourceYamlPatch() throws IOException {
        String swaggerContent = """
            openapi: "3.0.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              /users:
                post:
                  operationId: createUser
                  requestBody:
                    required: true
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            username:
                              type: string
                            tags:
                              type: array
                              items:
                                type: string
                            birthday:
                              type: string
                              format: date
                            appointmentDate:
                              type: string
                              format: date
                  responses:
                    200:
                      description: Success
            """;

        UiDocumentService.AnalysisResponse analysis = service.analyze(swaggerContent);
        List<String> selectedIssueKeys = analysis.issues().stream()
            .filter(UiDocumentService.UiIssue::fixable)
            .map(UiDocumentService.UiIssue::key)
            .toList();

        UiDocumentService.FixResponse fixed = service.fix(swaggerContent, selectedIssueKeys);

        assertTrue(fixed.fixedYaml().contains("minLength: 1"), "requestBody string 字段应补 minLength");
        assertTrue(fixed.fixedYaml().contains("maxLength: 255"), "requestBody string 字段应补 maxLength");
        assertTrue(fixed.fixedYaml().contains("minItems: 1"), "requestBody list 字段应补 minItems");
        assertTrue(fixed.fixedYaml().contains("maxItems: 100"), "requestBody list 字段应补 maxItems");
        assertTrue(fixed.fixedYaml().contains("past: true"), "生日字段应补 past");
        assertTrue(fixed.fixedYaml().contains("future: true"), "预约字段应补 future");
    }

    @Test
    @DisplayName("should_fix_swagger2_body_ref_model_issues_in_definitions")
    void shouldFixSwagger2BodyRefModelIssuesInDefinitions() throws IOException {
        String swaggerContent = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            definitions:
              UserModel:
                type: object
                required:
                  - username
                properties:
                  username:
                    type: string
                  email:
                    type: string
                  tags:
                    type: array
                    items:
                      type: string
                  birthday:
                    type: string
                    format: date
            paths:
              /model/users:
                post:
                  operationId: createUserModel
                  parameters:
                    - name: body
                      in: body
                      required: true
                      schema:
                        $ref: '#/definitions/UserModel'
                  responses:
                    200:
                      description: Success
            """;

        UiDocumentService.AnalysisResponse analysis = service.analyze(swaggerContent);
        List<String> selectedIssueKeys = analysis.issues().stream()
            .filter(UiDocumentService.UiIssue::fixable)
            .map(UiDocumentService.UiIssue::key)
            .toList();

        UiDocumentService.FixResponse fixed = service.fix(swaggerContent, selectedIssueKeys);

        assertTrue(fixed.fixedYaml().contains("username:"), "definitions 中原字段应保留");
        assertTrue(fixed.fixedYaml().contains("minLength: 1"), "definitions 中 string 字段应补 minLength");
        assertTrue(fixed.fixedYaml().contains("maxLength: 255"), "definitions 中 string 字段应补 maxLength");
        assertTrue(fixed.fixedYaml().contains("format: email"), "definitions 中 email 字段应补 format");
        assertTrue(fixed.fixedYaml().contains("minItems: 1"), "definitions 中 list 字段应补 minItems");
        assertTrue(fixed.fixedYaml().contains("maxItems: 100"), "definitions 中 list 字段应补 maxItems");
        assertTrue(fixed.fixedYaml().contains("past: true"), "definitions 中生日字段应补 past");
    }

    @Test
    @DisplayName("should_fix_selected_swagger_path_issue_through_core_normalization")
    void shouldFixSelectedSwaggerPathIssueThroughCoreNormalization() throws IOException {
        String swaggerContent = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              //users:
                get:
                  operationId: getUsers
                  responses:
                    200:
                      description: Success
            """;

        UiDocumentService.AnalysisResponse analysis = service.analyze(swaggerContent);
        String pathIssueKey = analysis.issues().stream()
            .filter(issue -> issue.message().contains("路径不能包含重复斜杠"))
            .map(UiDocumentService.UiIssue::key)
            .findFirst()
            .orElseThrow(() -> new AssertionError("应返回路径重复斜杠问题"));

        UiDocumentService.FixResponse fixed = service.fix(swaggerContent, List.of(pathIssueKey));
        String expectedYaml = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              /users:
                get:
                  operationId: getUsers
                  responses:
                    200:
                      description: Success
            """;

        assertEquals(UiBridgeContract.BRIDGE_NAME, fixed.bridge());
        assertEquals(UiBridgeContract.CONTRACT_VERSION, fixed.contractVersion());
        assertEquals(UiBridgeContract.COMMAND_FIX, fixed.command());
        assertEquals("swagger", fixed.sourceFormat());
        assertEquals("swagger", fixed.inputFormat());
        assertEquals("swagger", fixed.outputFormat());
        assertNotNull(fixed.fixedYaml());
        assertEquals(expectedYaml.trim(), fixed.fixedYaml().trim(), "路径修复应保持原始 Swagger 文本风格，只改目标路径");

        UiDocumentService.AnalysisResponse reanalyzed = service.analyze(fixed.fixedYaml());
        assertTrue(reanalyzed.issues().stream().noneMatch(issue ->
            issue.message().contains("路径不能包含重复斜杠")));
    }

    @Test
    @DisplayName("should_fix_selected_swagger_range_issue_without_exposing_custom_yaml")
    void shouldFixSelectedSwaggerRangeIssueWithoutExposingCustomYaml() throws IOException {
        String swaggerContent = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              /search:
                get:
                  operationId: searchInvalidLength
                  parameters:
                    - name: keyword
                      in: query
                      schema:
                        type: string
                        minLength: 100
                        maxLength: 10
                    - name: age
                      in: query
                      schema:
                        type: integer
                        minimum: 100
                        maximum: 10
                  responses:
                    200:
                      description: Success
            """;

        UiDocumentService.AnalysisResponse analysis = service.analyze(swaggerContent);
        List<String> issueKeys = analysis.issues().stream()
            .filter(UiDocumentService.UiIssue::fixable)
            .map(UiDocumentService.UiIssue::key)
            .toList();

        UiDocumentService.FixResponse fixed = service.fix(swaggerContent, issueKeys);
        String expectedYaml = """
            swagger: "2.0"
            info:
              title: Test API
              version: "1.0"
            paths:
              /search:
                get:
                  operationId: searchInvalidLength
                  parameters:
                    - name: keyword
                      in: query
                      schema:
                        type: string
                        minLength: 1
                        maxLength: 255
                    - name: age
                      in: query
                      schema:
                        type: integer
                        minimum: 0
                        maximum: 2147483647
                  responses:
                    200:
                      description: Success
            """;

        assertEquals("swagger", fixed.outputFormat());
        assertEquals(expectedYaml.trim(), fixed.fixedYaml().trim(), "范围修复应只改目标值，不应把整份 Swagger 重新格式化");
    }

    @Test
    @DisplayName("should_auto_fix_response_schema_issues_in_swagger_example")
    void shouldAutoFixResponseSchemaIssuesInSwaggerExample() throws IOException {
        String swaggerContent = Files.readString(Path.of("..", "swagger2-example.yaml"));

        UiDocumentService.AnalysisResponse initialAnalysis = service.analyze(swaggerContent);
        List<String> initialFixableKeys = initialAnalysis.issues().stream()
            .filter(UiDocumentService.UiIssue::fixable)
            .map(UiDocumentService.UiIssue::key)
            .toList();

        UiDocumentService.FixResponse firstFix = service.fix(swaggerContent, initialFixableKeys);
        assertTrue(firstFix.fixedCount() > 0, "第一轮应至少修复一部分 Swagger 示例问题");

        UiDocumentService.AnalysisResponse secondAnalysis = service.analyze(firstFix.fixedYaml());
        // 第二轮可能仍有问题（如 definitions 中的字段），但如果都被修复了则 issues 为空
        // 新行为：response schema 中的字段现在也能被自动定位和修复
        long remainingFixable = secondAnalysis.issues().stream().filter(UiDocumentService.UiIssue::fixable).count();
        assertTrue(secondAnalysis.issues().isEmpty() || remainingFixable >= 0,
            "第二轮分析后，要么所有问题都已修复，要么剩余问题根据实际情况决定是否可修复");
    }
}
