package com.apicgen.intellij.service;

import com.intellij.openapi.project.Project;

/**
 * Project service for API CodeGen plugin.
 * Provides shared state and services for the plugin within a project.
 */
public interface ApiCodegenProjectService {
    /**
     * Get the associated project
     */
    Project getProject();

    /**
     * Check if the service is initialized
     */
    boolean isInitialized();
}
