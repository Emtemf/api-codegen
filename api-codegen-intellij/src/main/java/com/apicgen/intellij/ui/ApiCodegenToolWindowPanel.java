package com.apicgen.intellij.ui;

import com.intellij.openapi.project.Project;
import com.intellij.ui.components.JBPanel;
import com.intellij.ui.components.JBTextField;
import com.intellij.ui.layout.GrowPolicy;
import com.intellij.ui.layout.GridLayout;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;
import java.awt.*;

/**
 * Main panel for the API CodeGen tool window.
 */
public class ApiCodegenToolWindowPanel extends JBPanel<ApiCodegenToolWindowPanel> {

    private final Project project;
    private JTextArea logArea;
    private JBTextField yamlPathField;

    public ApiCodegenToolWindowPanel(@NotNull Project project) {
        super(new BorderLayout());
        this.project = project;
        initUI();
    }

    private void initUI() {
        // Title
        JLabel titleLabel = new JLabel("API CodeGen", SwingConstants.CENTER);
        titleLabel.setFont(titleLabel.getFont().deriveFont(Font.BOLD, 16f));
        add(titleLabel, BorderLayout.NORTH);

        // Main content panel
        JPanel contentPanel = new JPanel(new GridLayout(3, 1, 5, 5));

        // YAML Path section
        JPanel yamlPanel = new JPanel(new BorderLayout(5, 5));
        JLabel yamlLabel = new JLabel("YAML File:");
        yamlPathField = new JBTextField("src/main/resources/api.yaml");
        yamlPanel.add(yamlLabel, BorderLayout.WEST);
        yamlPanel.add(yamlPathField, BorderLayout.CENTER);

        JButton browseButton = new JButton("Browse...");
        yamlPanel.add(browseButton, BorderLayout.EAST);
        contentPanel.add(yamlPanel);

        // Action buttons panel
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 10, 5));

        JButton analyzeButton = new JButton("Analyze");
        JButton generateButton = new JButton("Generate Code");
        JButton refreshButton = new JButton("Refresh");

        buttonPanel.add(analyzeButton);
        buttonPanel.add(generateButton);
        buttonPanel.add(refreshButton);
        contentPanel.add(buttonPanel);

        // Log area
        JPanel logPanel = new JPanel(new BorderLayout(5, 5));
        JLabel logLabel = new JLabel("Output Log:");
        logArea = new JTextArea(10, 50);
        logArea.setEditable(false);
        logArea.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        JScrollPane scrollPane = new JScrollPane(logArea);
        scrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_ALWAYS);

        logPanel.add(logLabel, BorderLayout.NORTH);
        logPanel.add(scrollPane, BorderLayout.CENTER);
        contentPanel.add(logPanel);

        add(contentPanel, BorderLayout.CENTER);

        // Add log message
        logMessage("API CodeGen plugin initialized");
        logMessage("Project: " + project.getName());
    }

    /**
     * Log a message to the text area
     */
    public void logMessage(String message) {
        String timestamp = java.time.LocalDateTime.now().toString();
        logArea.append("[" + timestamp + "] " + message + "\n");
        logArea.setCaretPosition(logArea.getDocument().getLength());
    }

    /**
     * Get the project
     */
    public Project getProject() {
        return project;
    }

    /**
     * Get the YAML path field
     */
    public JBTextField getYamlPathField() {
        return yamlPathField;
    }
}
