package com.apicgen.intellij.activity;

import com.apicgen.intellij.toolwindow.ApiCodegenToolWindowFactory;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.startup.StartupActivity;
import org.jetbrains.annotations.NotNull;

/**
 * Project startup activity for API CodeGen plugin.
 */
public class ProjectStartupActivity implements StartupActivity {
    @Override
    public void runActivity(@NotNull Project project) {
        // This runs when the project is opened
        // The tool window will be shown when user clicks on it
    }
}
