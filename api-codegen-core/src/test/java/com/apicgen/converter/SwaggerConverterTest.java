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

        @Test
        @DisplayName("should_resolve_swagger_20_body_ref_fields_from_definitions")
        void shouldResolveSwagger20BodyRefFieldsFromDefinitions() throws IOException {
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                definitions:
                  UserModel:
                    type: object
                    required:
                      - username
                    properties:
                      username:
                        type: string
                      tags:
                        type: array
                        minItems: 1
                        maxItems: 10
                        items:
                          type: string
                paths:
                  /users:
                    post:
                      operationId: createUser
                      parameters:
                        - name: body
                          in: body
                          required: true
                          schema:
                            $ref: '#/definitions/UserModel'
                      responses:
                        201:
                          description: Created
                """;

            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            assertNotNull(apiDefinition);
            var api = apiDefinition.getApis().get(0);
            assertNotNull(api.getRequest());
            assertEquals(2, api.getRequest().getFields().size());
            assertEquals("username", api.getRequest().getFields().get(0).getName());
            assertTrue(api.getRequest().getFields().get(0).isRequired());
            assertEquals("tags", api.getRequest().getFields().get(1).getName());
            assertNotNull(api.getRequest().getFields().get(1).getValidation());
            assertEquals(1, api.getRequest().getFields().get(1).getValidation().getMinSize());
            assertEquals(10, api.getRequest().getFields().get(1).getValidation().getMaxSize());
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

        @Test
        @DisplayName("should_convert_openapi_30_request_body_properties_with_required_and_validation")
        void shouldConvertOpenApi30RequestBodyPropertiesWithRequiredAndValidation() throws IOException {
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
                              required:
                                - username
                              properties:
                                username:
                                  type: string
                                  minLength: 4
                                  maxLength: 20
                                email:
                                  type: string
                                  format: email
                                tags:
                                  type: array
                                  minItems: 1
                                  maxItems: 10
                                  items:
                                    type: string
                      responses:
                        200:
                          description: Success
                """;

            ApiDefinition apiDefinition = YamlParser.parse(openapiContent);

            assertNotNull(apiDefinition);
            var api = apiDefinition.getApis().get(0);
            assertNotNull(api.getRequest());
            assertEquals(3, api.getRequest().getFields().size());

            var username = api.getRequest().getFields().get(0);
            assertEquals("username", username.getName());
            assertTrue(username.isRequired());
            assertNotNull(username.getValidation());
            assertEquals(4, username.getValidation().getMinLength());
            assertEquals(20, username.getValidation().getMaxLength());

            var email = api.getRequest().getFields().get(1);
            assertEquals("email", email.getName());
            assertNotNull(email.getValidation());
            assertTrue(Boolean.TRUE.equals(email.getValidation().getEmail()));

            var tags = api.getRequest().getFields().get(2);
            assertEquals("tags", tags.getName());
            assertNotNull(tags.getValidation());
            assertEquals(1, tags.getValidation().getMinSize());
            assertEquals(10, tags.getValidation().getMaxSize());
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

        @Test
        @DisplayName("should_normalize_path_with_repeated_backslashes")
        void shouldNormalizePathWithRepeatedBackslashes() throws IOException {
            // Given - a path with repeated backslashes in an escaped YAML key
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  "/api\\\\\\\\users":
                    get:
                      operationId: queryUsers
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then - repeated backslashes should be normalized to forward slashes
            assertNotNull(apiDefinition);
            var api = apiDefinition.getApis().get(0);
            assertEquals("/api/users", api.getPath());
        }

        @Test
        @DisplayName("should_normalize_path_with_mixed_slashes_and_backslashes")
        void shouldNormalizePathWithMixedSlashesAndBackslashes() throws IOException {
            // Given - a path with mixed forward slashes, backslashes, and repeated separators
            String swaggerContent = """
                swagger: "2.0"
                info:
                  title: User API
                  version: "1.0"
                paths:
                  '/api\\/v1//users\\\\{id}':
                    get:
                      operationId: getUser
                      responses:
                        200:
                          description: Success
                """;

            // When
            ApiDefinition apiDefinition = YamlParser.parse(swaggerContent);

            // Then - all separators should be normalized to single forward slashes
            assertNotNull(apiDefinition);
            var api = apiDefinition.getApis().get(0);
            assertEquals("/api/v1/users/{id}", api.getPath());
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
