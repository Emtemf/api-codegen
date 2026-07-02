package com.apicgen;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

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

    @Test
    public void testStartupExampleYamlGeneratesCode(@TempDir Path outputDir) throws IOException {
        File yamlFile = new File("../api.yaml").getCanonicalFile();
        assertTrue(yamlFile.isFile(), "startup example api.yaml should exist at repository root");

        Main.main(new String[] {
                yamlFile.getAbsolutePath(),
                "-output=" + outputDir,
                "-force"
        });

        Path generatedController = outputDir.resolve("controller/getUser/QueryController.java");
        Path generatedRequest = outputDir.resolve("request/getUser/GetUserReq.java");
        Path generatedResponse = outputDir.resolve("response/getUser/GetUserRsp.java");

        assertTrue(Files.isRegularFile(generatedController), "startup example should generate controller");
        assertTrue(Files.isRegularFile(generatedRequest), "startup example should generate request class");
        assertTrue(Files.isRegularFile(generatedResponse), "startup example should generate response class");
    }
}
