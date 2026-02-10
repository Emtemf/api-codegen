package com.apicgen.intellij;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for API CodeGen IntelliJ Plugin actions.
 */
class ActionTests {

    @Test
    void testAnalyzeActionExists() {
        AnalyzeAction action = new AnalyzeAction();
        assertNotNull(action, "AnalyzeAction should be created successfully");
    }

    @Test
    void testAutoFixActionExists() {
        AutoFixAction action = new AutoFixAction();
        assertNotNull(action, "AutoFixAction should be created successfully");
    }

    @Test
    void testGenerateCodeActionExists() {
        GenerateCodeAction action = new GenerateCodeAction();
        assertNotNull(action, "GenerateCodeAction should be created successfully");
    }

    @Test
    void testRefreshActionExists() {
        RefreshAction action = new RefreshAction();
        assertNotNull(action, "RefreshAction should be created successfully");
    }

    @Test
    void testShowToolWindowActionExists() {
        ShowToolWindowAction action = new ShowToolWindowAction();
        assertNotNull(action, "ShowToolWindowAction should be created successfully");
    }

    @Test
    void testApiCodegenPluginConstants() {
        assertEquals("com.apicgen.api-codegen-intellij", ApiCodegenPlugin.PLUGIN_ID);
        assertEquals("API CodeGen", ApiCodegenPlugin.PLUGIN_NAME);
    }
}
