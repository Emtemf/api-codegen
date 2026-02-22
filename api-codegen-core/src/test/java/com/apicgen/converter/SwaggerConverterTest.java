package com.apicgen.converter;

import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * SwaggerConverter 单元测试
 *
 * 测试场景：
 * - Swagger 2.0 转换
 * - OpenAPI 3.0 转换
 * - 路径规范化
 * - 参数转换
 * - 复杂嵌套对象
 */
class SwaggerConverterTest {

    @Nested
    @DisplayName("should_convert_swagger_20")
    class ShouldConvertSwagger20 {

        @Test
        @DisplayName("should_convert_basic_swagger_20")
        void shouldConvertBasicSwagger20() throws IOException {
            // Given
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
                      parameters:
                        - name: page
                          in: query
                          description: Page number
                          required: false
                          type: integer
                        - name: size
                          in: query
                          description: Page size
                          required: false
                          type: integer
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
            assertEquals("/users", api.getPath());
            assertEquals("GET", api.getMethod().name());
        }

        @Test
        @DisplayName("should_convert_swagger_20_with_post")
        void shouldConvertSwagger20WithPost() throws IOException {
            // Given
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users:
                    post:
                      summary: Create user
                      operationId: createUser
                      parameters:
                        - name: user
                          in: body
                          required: true
                          schema:
                            type: object
                            properties:
                              username:
                                type: string
                              email:
                                type: string
                      responses:
                        201:
                          description: Created
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then
            assertNotNull(apiDefinition);
            assertEquals(1, apiDefinition.getApis().size());

            var api = apiDefinition.getApis().get(0);
            assertEquals("createUser", api.getName());
            assertEquals("/users", api.getPath());
            assertEquals("POST", api.getMethod().name());
        }
    }

    @Nested
    @DisplayName("should_convert_openapi_30")
    class ShouldConvertOpenApi30 {

        @Test
        @DisplayName("should_convert_basic_openapi_30")
        void shouldConvertBasicOpenApi30() throws IOException {
            // Given
            String openapiContent = """
                openapi: "3.0.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users:
                    get:
                      operationId: queryUsers
                      parameters:
                        - name: page
                          in: query
                          description: Page number
                          required: false
                          schema:
                            type: integer
                        - name: size
                          in: query
                          description: Page size
                          required: false
                          schema:
                            type: integer
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(openapiContent);

            // Then
            assertNotNull(apiDefinition);
            assertNotNull(apiDefinition.getApis());
            assertEquals(1, apiDefinition.getApis().size());

            var api = apiDefinition.getApis().get(0);
            assertEquals("queryUsers", api.getName());
            assertEquals("/users", api.getPath());
            assertEquals("GET", api.getMethod().name());
        }

        @Test
        @DisplayName("should_convert_openapi_30_with_path_params")
        void shouldConvertOpenApi30WithPathParams() throws IOException {
            // Given
            String openapiContent = """
                openapi: "3.0.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users/{id}:
                    get:
                      operationId: getUser
                      parameters:
                        - name: id
                          in: path
                          required: true
                          schema:
                            type: integer
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(openapiContent);

            // Then
            assertNotNull(apiDefinition);
            assertEquals(1, apiDefinition.getApis().size());

            var api = apiDefinition.getApis().get(0);
            assertEquals("getUser", api.getName());
            assertEquals("/users/{id}", api.getPath());
            assertEquals("GET", api.getMethod().name());
        }
    }

    @Nested
    @DisplayName("should_handle_path_normalization")
    class ShouldHandlePathNormalization {

        @Test
        @DisplayName("should_normalize_path_with_double_slashes")
        void shouldNormalizePathWithDoubleSlashes() throws IOException {
            // Given - a path with double slashes
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /api//users:
                    get:
                      operationId: queryUsers
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then - double slashes should be normalized to single slash
            assertNotNull(apiDefinition);
            var api = apiDefinition.getApis().get(0);
            // The path should have double slashes collapsed to single
            assertEquals("/api/users", api.getPath());
        }
    }

    @Nested
    @DisplayName("should_convert_complex_types")
    class ShouldConvertComplexTypes {

        @Test
        @DisplayName("should_convert_nested_object_properties")
        void shouldConvertNestedObjectProperties() throws IOException {
            // Given
            String openapiContent = """
                openapi: "3.0.0"
                info:
                  title: User API
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
                                profile:
                                  type: object
                                  properties:
                                    age:
                                      type: integer
                                    email:
                                      type: string
                      responses:
                        201:
                          description: Created
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(openapiContent);

            // Then
            assertNotNull(apiDefinition);
            assertEquals(1, apiDefinition.getApis().size());

            var api = apiDefinition.getApis().get(0);
            assertNotNull(api.getRequest());
            assertNotNull(api.getRequest().getFields());

            // Should have username and nested profile
            boolean hasUsername = api.getRequest().getFields().stream()
                    .anyMatch(f -> "username".equals(f.getName()));
            assertTrue(hasUsername, "Should have username field");
        }
    }

    @Nested
    @DisplayName("should_handle_multiple_apis")
    class ShouldHandleMultipleApis {

        @Test
        @DisplayName("should_convert_multiple_paths")
        void shouldConvertMultiplePaths() throws IOException {
            // Given
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  /users:
                    get:
                      operationId: queryUsers
                      responses:
                        200:
                          description: Success
                    post:
                      operationId: createUser
                      responses:
                        201:
                          description: Created
                  /users/{id}:
                    get:
                      operationId: getUser
                      parameters:
                        - name: id
                          in: path
                          required: true
                          type: integer
                      responses:
                        200:
                          description: Success
                    delete:
                      operationId: deleteUser
                      parameters:
                        - name: id
                          in: path
                          required: true
                          type: integer
                      responses:
                        204:
                          description: Deleted
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then
            assertNotNull(apiDefinition);
            assertEquals(4, apiDefinition.getApis().size());
        }
    }
}
