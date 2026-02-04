package com.apicgen.maven;

import org.junit.jupiter.api.Test;

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
}
