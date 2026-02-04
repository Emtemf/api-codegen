package com.apicgen;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for Main entry point.
 */
public class MainTest {

    @Test
    public void testMainClassExists() {
        // Test that Main class can be loaded
        assertNotNull(Main.class, "Main class should exist");
    }

    @Test
    public void testMainHasMainMethod() throws NoSuchMethodException {
        // Test that Main class has main method
        assertNotNull(Main.class.getMethod("main", String[].class), "Main class should have main method");
    }
}
