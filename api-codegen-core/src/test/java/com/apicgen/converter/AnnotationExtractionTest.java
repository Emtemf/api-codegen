package com.apicgen.converter;

import com.apicgen.model.Api;
import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 自定义注解解析测试
 *
 * 测试场景：
 * - x-java-class-annotations 解析 (path 级别)
 * - x-java-method-annotations 解析 (operation 级别)
 * - 全局类注解解析
 */
class AnnotationExtractionTest {

    @Nested
    @DisplayName("should_parse_swagger_annotations")
    class ShouldParseSwaggerAnnotations {

        @Test
        @DisplayName("should_parse_class_annotations_from_path_level")
        void shouldParseClassAnnotationsFromPathLevel() throws IOException {
            // Given - Swagger 2.0 with class annotations at path level
            String swaggerContent = """
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
                      summary: Query users
                      operationId: queryUsers
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then
            assertNotNull(apiDefinition);
            assertNotNull(apiDefinition.getApis());
            assertEquals(1, apiDefinition.getApis().size());

            var api = apiDefinition.getApis().get(0);
            assertEquals("queryUsers", api.getName());

            // 验证类注解被正确解析
            List<String> classAnnotations = api.getClassAnnotations();
            assertNotNull(classAnnotations);
            assertEquals(2, classAnnotations.size());
            assertTrue(classAnnotations.contains("@Secured"));
            assertTrue(classAnnotations.contains("@AuditLog(action='USER_QUERY')"));
        }

        @Test
        @DisplayName("should_parse_method_annotations_from_operation_level")
        void shouldParseMethodAnnotationsFromOperationLevel() throws IOException {
            // Given - Swagger 2.0 with method annotations at operation level
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users:
                    get:
                      summary: Query users
                      operationId: queryUsers
                      x-java-method-annotations:
                        - "@Permission('user:read')"
                        - "@RateLimiter(maxRequests=100)"
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then
            assertNotNull(apiDefinition);
            var api = apiDefinition.getApis().get(0);

            // 验证方法注解被正确解析
            List<String> methodAnnotations = api.getMethodAnnotations();
            assertNotNull(methodAnnotations);
            assertEquals(2, methodAnnotations.size());
            assertTrue(methodAnnotations.contains("@Permission('user:read')"));
            assertTrue(methodAnnotations.contains("@RateLimiter(maxRequests=100)"));
        }

        @Test
        @DisplayName("should_parse_both_class_and_method_annotations")
        void shouldParseBothClassAndMethodAnnotations() throws IOException {
            // Given - Swagger 2.0 with both class and method annotations
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users:
                    x-java-class-annotations:
                      - "@Secured"
                    get:
                      summary: Query users
                      operationId: queryUsers
                      x-java-method-annotations:
                        - "@Transactional"
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then
            var api = apiDefinition.getApis().get(0);

            // 验证类注解
            assertNotNull(api.getClassAnnotations());
            assertEquals(1, api.getClassAnnotations().size());
            assertEquals("@Secured", api.getClassAnnotations().get(0));

            // 验证方法注解
            assertNotNull(api.getMethodAnnotations());
            assertEquals(1, api.getMethodAnnotations().size());
            assertEquals("@Transactional", api.getMethodAnnotations().get(0));
        }

        @Test
        @DisplayName("should_handle_multiple_operations_with_same_path")
        void shouldHandleMultipleOperationsWithSamePath() throws IOException {
            // Given - Multiple operations under same path with different annotations
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users:
                    x-java-class-annotations:
                      - "@Secured"
                    get:
                      summary: Query users
                      operationId: queryUsers
                      x-java-method-annotations:
                        - "@Permission('user:read')"
                      responses:
                        200:
                          description: Success
                    post:
                      summary: Create user
                      operationId: createUser
                      x-java-method-annotations:
                        - "@Permission('user:create')"
                        - "@AuditLog(action='CREATE_USER')"
                      responses:
                        201:
                          description: Created
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then
            assertEquals(2, apiDefinition.getApis().size());

            // GET operation
            var getApi = apiDefinition.getApis().stream()
                .filter(a -> "queryUsers".equals(a.getName()))
                .findFirst().orElse(null);
            assertNotNull(getApi);
            assertEquals(1, getApi.getClassAnnotations().size());
            assertEquals("@Secured", getApi.getClassAnnotations().get(0));
            assertEquals(1, getApi.getMethodAnnotations().size());
            assertEquals("@Permission('user:read')", getApi.getMethodAnnotations().get(0));

            // POST operation
            var postApi = apiDefinition.getApis().stream()
                .filter(a -> "createUser".equals(a.getName()))
                .findFirst().orElse(null);
            assertNotNull(postApi);
            assertEquals(1, postApi.getClassAnnotations().size());
            assertEquals("@Secured", postApi.getClassAnnotations().get(0));
            assertEquals(2, postApi.getMethodAnnotations().size());
            assertTrue(postApi.getMethodAnnotations().contains("@Permission('user:create')"));
            assertTrue(postApi.getMethodAnnotations().contains("@AuditLog(action='CREATE_USER')"));
        }

        @Test
        @DisplayName("should_parse_annotations_without_any_annotations")
        void shouldParseAnnotationsWithoutAnyAnnotations() throws IOException {
            // Given - Swagger without any annotations
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users:
                    get:
                      summary: Query users
                      operationId: queryUsers
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then
            var api = apiDefinition.getApis().get(0);

            // 没有注解时应该返回 null 或空列表
            assertTrue(api.getClassAnnotations() == null || api.getClassAnnotations().isEmpty());
            assertTrue(api.getMethodAnnotations() == null || api.getMethodAnnotations().isEmpty());
        }
    }

    @Nested
    @DisplayName("should_parse_openapi3_annotations")
    class ShouldParseOpenapi3Annotations {

        @Test
        @DisplayName("should_parse_annotations_from_openapi3")
        void shouldParseAnnotationsFromOpenapi3() throws IOException {
            // Given - OpenAPI 3.0 with annotations
            String openapiContent = """
                openapi: "3.0.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users:
                    x-java-class-annotations:
                      - "@Secured"
                    get:
                      summary: Query users
                      operationId: queryUsers
                      x-java-method-annotations:
                        - "@Permission('user:read')"
                      responses:
                        '200':
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(openapiContent);

            // Then
            assertNotNull(apiDefinition);
            var api = apiDefinition.getApis().get(0);

            assertNotNull(api.getClassAnnotations());
            assertEquals(1, api.getClassAnnotations().size());
            assertEquals("@Secured", api.getClassAnnotations().get(0));

            assertNotNull(api.getMethodAnnotations());
            assertEquals(1, api.getMethodAnnotations().size());
            assertEquals("@Permission('user:read')", api.getMethodAnnotations().get(0));
        }
    }

    @Nested
    @DisplayName("should_generate_code_with_annotations")
    class ShouldGenerateCodeWithAnnotations {

        @Test
        @DisplayName("should_generate_controller_with_class_annotations")
        void shouldGenerateControllerWithClassAnnotations() throws IOException {
            // Given - Swagger 2.0 with class annotations at path level
            String swaggerContent = """
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
                      summary: Query users
                      operationId: queryUsers
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then - verify code generation includes annotations
            com.apicgen.config.CodegenConfig config = new com.apicgen.config.CodegenConfig();
            com.apicgen.generator.CodeGenerator generator =
                com.apicgen.generator.CodeGeneratorFactory.getGenerator(config);

            // Use CXF generator which has generateControllers method
            com.apicgen.generator.cxf.CxfCodeGenerator cxfGenerator = new com.apicgen.generator.cxf.CxfCodeGenerator();
            var controllerFiles = cxfGenerator.generateControllers(apiDefinition, config);
            assertNotNull(controllerFiles);
            assertEquals(1, controllerFiles.size());

            String controllerCode = controllerFiles.values().iterator().next();
            // Verify class annotations are in generated code
            assertTrue(controllerCode.contains("@Secured"), "Should contain @Secured annotation");
            assertTrue(controllerCode.contains("@AuditLog"), "Should contain @AuditLog annotation");
        }

        @Test
        @DisplayName("should_generate_controller_with_method_annotations")
        void shouldGenerateControllerWithMethodAnnotations() throws IOException {
            // Given - Swagger 2.0 with method annotations at operation level
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users:
                    get:
                      summary: Query users
                      operationId: queryUsers
                      x-java-method-annotations:
                        - "@Permission('user:read')"
                        - "@RateLimiter(maxRequests=100)"
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then - verify code generation includes annotations
            com.apicgen.config.CodegenConfig config = new com.apicgen.config.CodegenConfig();
            com.apicgen.generator.CodeGenerator generator =
                com.apicgen.generator.CodeGeneratorFactory.getGenerator(config);

            // Use CXF generator which has generateControllers method
            com.apicgen.generator.cxf.CxfCodeGenerator cxfGenerator = new com.apicgen.generator.cxf.CxfCodeGenerator();
            var controllerFiles = cxfGenerator.generateControllers(apiDefinition, config);
            assertNotNull(controllerFiles);
            assertEquals(1, controllerFiles.size());

            String controllerCode = controllerFiles.values().iterator().next();
            // Verify method annotations are in generated code
            assertTrue(controllerCode.contains("@Permission('user:read')"), "Should contain @Permission annotation");
            assertTrue(controllerCode.contains("@RateLimiter"), "Should contain @RateLimiter annotation");
        }
    }
}
