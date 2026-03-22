package com.apicgen.bridge;

import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.io.IOException;
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

        assertEquals(UiBridgeContract.BRIDGE_NAME, fixed.bridge());
        assertEquals(UiBridgeContract.CONTRACT_VERSION, fixed.contractVersion());
        assertEquals(UiBridgeContract.COMMAND_FIX, fixed.command());
        assertEquals("swagger", fixed.sourceFormat());
        assertEquals("swagger", fixed.inputFormat());
        assertEquals("custom", fixed.outputFormat());
        assertNotNull(fixed.fixedYaml());
        assertTrue(fixed.fixedYaml().contains("apis:"), "core 修复输出应以统一 ApiDefinition YAML 为准");
        assertFalse(fixed.fixedYaml().contains("//users"));
        ApiDefinition fixedDefinition = YamlParser.parse(fixed.fixedYaml());
        assertEquals("/users", fixedDefinition.getApis().getFirst().getPath());

        UiDocumentService.AnalysisResponse reanalyzed = service.analyze(fixed.fixedYaml());
        assertTrue(reanalyzed.issues().stream().noneMatch(issue ->
            issue.message().contains("路径不能包含重复斜杠")));
    }
}
