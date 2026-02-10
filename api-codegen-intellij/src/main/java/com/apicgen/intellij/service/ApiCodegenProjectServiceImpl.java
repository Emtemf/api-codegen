package com.apicgen.intellij.service;

import com.intellij.openapi.components.Service;
import com.intellij.openapi.project.Project;

/**
 * Implementation of ApiCodegenProjectService.
 * Registered as a project-level service in plugin.xml.
 */
@Service(Service.Level.PROJECT)
public final class ApiCodegenProjectServiceImpl implements ApiCodegenProjectService {

    private final Project project;
    private boolean initialized = false;

    public ApiCodegenProjectServiceImpl(Project project) {
        this.project = project;
        this.initialized = true;
        System.out.println("ApiCodegenProjectService initialized for project: " + project.getName());
    }

    @Override
    public Project getProject() {
        return project;
    }

    @Override
    public boolean isInitialized() {
        return initialized;
    }

    /**
     * Get the service instance from the project
     */
    public static ApiCodegenProjectService getInstance(Project project) {
        return project.getService(ApiCodegenProjectService.class);
    }
}
