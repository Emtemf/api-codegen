package com.apicgen.intellij.actions;

import com.apicgen.intellij.ApiCodegenPlugin;
import com.apicgen.intellij.ui.ApiCodegenToolWindowPanel;
import com.intellij.openapi.action.AnAction;
import com.intellij.openapi.action.AnActionEvent;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

/**
 * Action to analyze the selected YAML file.
 */
public class AnalyzeAction extends AnAction {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            return;
        }

        ApiCodegenToolWindowPanel panel = getToolWindowPanel(project);
        if (panel != null) {
            // Trigger analyze via the panel
            panel.log("分析功能需要实现核心逻辑");
        }
    }

    @Nullable
    private ApiCodegenToolWindowPanel getToolWindowPanel(Project project) {
        ToolWindowManager toolWindowManager = ToolWindowManager.getInstance(project);
        ToolWindow toolWindow = toolWindowManager.getToolWindow(ApiCodegenPlugin.PLUGIN_NAME);

        if (toolWindow == null) {
            return null;
        }

        // Get content from tool window
        var contentManager = toolWindow.getContentManager();
        var contents = contentManager.getContents();

        if (contents.length > 0) {
            var component = contents[0].getComponent();
            if (component instanceof ApiCodegenToolWindowPanel) {
                return (ApiCodegenToolWindowPanel) component;
            }
        }

        return null;
    }
}
