package com.apicgen.intellij.service;

import com.intellij.openapi.components.Service;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.vfs.VirtualFile;
import com.intellij.openapi.vfs.VirtualFileManager;
import com.intellij.psi.PsiManager;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Project-level service for API CodeGen plugin.
 */
@Service
public final class ApiCodegenProjectService {
    private final Project project;

    private ApiCodegenProjectService(Project project) {
        this.project = project;
    }

    public static ApiCodegenProjectService getInstance(Project project) {
        return project.getService(ApiCodegenProjectService.class);
    }

    /**
     * Find all YAML files in the project root directory.
     */
    public List<String> findYamlFiles() {
        List<String> yamlFiles = new ArrayList<>();

        // Get project base path
        String basePath = project.getBasePath();
        if (basePath == null) {
            return yamlFiles;
        }

        // Scan project root for YAML files
        File projectDir = new File(basePath);
        if (projectDir.exists() && projectDir.isDirectory()) {
            scanDirectory(projectDir, yamlFiles, 1);
        }

        return yamlFiles;
    }

    private void scanDirectory(File dir, List<String> result, int maxDepth) {
        if (maxDepth <= 0) {
            return;
        }

        File[] files = dir.listFiles();
        if (files == null) {
            return;
        }

        for (File file : files) {
            if (file.isDirectory()) {
                // Skip common non-source directories
                String name = file.getName();
                if (!name.equals("target") && !name.equals(".idea") &&
                    !name.equals("node_modules") && !name.startsWith(".")) {
                    scanDirectory(file, result, maxDepth - 1);
                }
            } else if (file.getName().endsWith(".yaml") || file.getName().endsWith(".yml")) {
                // Store relative path from project root
                String relativePath = getRelativePath(file);
                if (relativePath != null) {
                    result.add(relativePath);
                }
            }
        }
    }

    private String getRelativePath(File file) {
        String projectPath = project.getBasePath();
        if (projectPath == null) {
            return null;
        }

        try {
            String filePath = file.getCanonicalPath();
            String basePath = new File(projectPath).getCanonicalPath();

            if (filePath.startsWith(basePath)) {
                return filePath.substring(basePath.length() + 1);
            }
        } catch (Exception e) {
            // Ignore
        }

        return file.getName();
    }

    /**
     * Get the absolute path for a relative YAML file path.
     */
    public String getAbsolutePath(String relativePath) {
        String basePath = project.getBasePath();
        if (basePath == null) {
            return relativePath;
        }

        return basePath + File.separator + relativePath;
    }

    /**
     * Refresh the project to show newly created files.
     */
    public void refreshProject() {
        VirtualFileManager.getInstance().syncRefresh();
    }
}
