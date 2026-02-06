package com.apicgen.intellij.actions;

import com.apicgen.intellij.toolwindow.ApiCodegenToolWindowFactory;
import com.intellij.openapi.action.AnAction;
import com.intellij.openapi.action.AnActionEvent;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Action to show the API CodeGen tool window.
 */
public class ShowToolWindowAction extends AnAction {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            return;
        }

        ToolWindowManager toolWindowManager = ToolWindowManager.getInstance(project);
        ToolWindow toolWindow = toolWindowManager.getToolWindow(ApiCodegenPlugin.PLUGIN_NAME);

        if (toolWindow != null) {
            toolWindow.show();
        }
    }
}
