package com.apicgen.intellij.toolwindow;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowFactory;
import com.intellij.ui.content.Content;
import com.intellij.ui.content.ContentFactory;
import com.apicgen.intellij.ui.ApiCodegenToolWindowPanel;
import org.jetbrains.annotations.NotNull;

/**
 * Factory for creating the API CodeGen tool window.
 */
public class ApiCodegenToolWindowFactory implements ToolWindowFactory {

    @Override
    public void createToolWindow(@NotNull Project project, @NotNull ToolWindow toolWindow) {
        // Create the tool window content
        ApiCodegenToolWindowPanel panel = new ApiCodegenToolWindowPanel(project);

        ContentFactory contentFactory = ContentFactory.getInstance();
        Content content = contentFactory.createContent(panel, "", false);
        toolWindow.getContentManager().addContent(content);

        System.out.println("API CodeGen tool window created for project: " + project.getName());
    }

    @Override
    public void init(@NotNull ToolWindow toolWindow) {
        super.init(toolWindow);
    }

    @Override
    public boolean shouldBeAvailable(@NotNull Project project) {
        return true;
    }
}
