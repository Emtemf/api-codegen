package com.apicgen.maven;

import com.apicgen.config.CodegenConfig;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for ApiCodegenMojo.
 */
public class ApiCodegenMojoTest {

    @Test
    public void testMojoClassExists() {
        // Test that ApiCodegenMojo class can be loaded
        assertNotNull(ApiCodegenMojo.class, "ApiCodegenMojo class should exist");
    }

    @Test
    public void testMojoHasDefaultConfiguration() {
        ApiCodegenMojo mojo = new ApiCodegenMojo();
        assertNotNull(mojo, "Mojo instance should be created");
    }

    @Test
    public void shouldUseSingleYamlDefaultsWithoutImplicitConfigFile() throws Exception {
        ApiCodegenMojo mojo = new ApiCodegenMojo();

        setField(mojo, "basePackage", "com.example.demo");
        setField(mojo, "framework", "spring");
        setField(mojo, "openapi", true);

        CodegenConfig config = invokeLoadConfig(mojo);

        assertEquals("com.example.demo", config.getBasePackage());
        assertEquals(CodegenConfig.FrameworkType.SPRING, config.getFramework());
        assertTrue(config.getOpenApi().isEnabled());
        assertNotNull(config.getOutput());
        assertEquals("generated/api/", config.getOutput().getController().getPath());
        assertEquals("src/main/java/req/", config.getOutput().getRequest().getPath());
        assertEquals("src/main/java/rsp/", config.getOutput().getResponse().getPath());
        assertNull(config.getCustomAnnotations(), "single YAML mode should not implicitly load legacy external annotations");
    }

    @Test
    public void shouldIgnoreLegacyExternalConfigFileInProjectRoot() throws Exception {
        Path tempDir = Files.createTempDirectory("apicgen-mojo-test");
        Path legacyConfig = tempDir.resolve("legacy-config.yaml");
        Files.writeString(legacyConfig, """
            customAnnotations:
              classAnnotations:
                - "@SomeCustomAnnotation"
              methodAnnotations:
                - "@Permission(\\"default\\")"
            output:
              controller:
                path: custom/controller/
            """);

        ApiCodegenMojo mojo = new ApiCodegenMojo();
        setField(mojo, "yamlFile", tempDir.resolve("api.yaml").toString());
        setField(mojo, "outputDir", tempDir.resolve("out").toString());
        setField(mojo, "basePackage", "com.example.clean");

        CodegenConfig config = invokeLoadConfig(mojo);

        assertNull(config.getCustomAnnotations(), "legacy external config file in project root should no longer be auto-loaded");
        assertEquals("generated/api/", config.getOutput().getController().getPath());
    }

    private static void setField(ApiCodegenMojo mojo, String fieldName, Object value) throws Exception {
        Field field = ApiCodegenMojo.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(mojo, value);
    }

    private static CodegenConfig invokeLoadConfig(ApiCodegenMojo mojo) throws Exception {
        Method method = ApiCodegenMojo.class.getDeclaredMethod("loadConfig");
        method.setAccessible(true);
        return (CodegenConfig) method.invoke(mojo);
    }
}
