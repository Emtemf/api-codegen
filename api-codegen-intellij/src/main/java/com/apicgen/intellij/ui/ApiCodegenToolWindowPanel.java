package com.apicgen.intellij.ui;

import com.apicgen.core.ApiCodegenCore;
import com.apicgen.core.ConfigLoader;
import com.apicgen.core.FrameworkType;
import com.apicgen.core.GeneratorConfig;
import com.apicgen.intellij.ApiCodegenPlugin;
import com.apicgen.intellij.dialog.AutoFixConfirmDialog;
import com.apicgen.intellij.dialog.GenerateConfirmDialog;
import com.apicgen.intellij.service.ApiCodegenProjectService;
import com.apicgen.model.ApiDefinition;
import com.apicgen.parser.YamlParser;
import com.apicgen.validator.ApiValidator;
import com.apicgen.validator.ValidationError;
import com.apicgen.validator.ValidationFixer;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.SimpleToolWindowPanel;
import com.intellij.openapi.ui.VerticalFlowLayout;
import com.intellij.ui.JBColor;
import com.intellij.ui.components.JBScrollPane;
import com.intellij.ui.table.JBTable;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

/**
 * Main tool window panel for API CodeGen plugin.
 */
public class ApiCodegenToolWindowPanel extends SimpleToolWindowPanel implements Disposable {
    private final Project project;
    private final ApiCodegenProjectService projectService;

    // UI Components
    private JComboBox<String> yamlFileComboBox;
    private JButton analyzeButton;
    private JButton autoFixButton;
    private JButton generateButton;
    private JButton refreshButton;
    private JCheckBox generateControllerCheck;
    private JCheckBox generateRequestCheck;
    private JCheckBox generateResponseCheck;
    private JTextArea logArea;
    private JBTable issueTable;
    private DefaultTableModel issueTableModel;

    public ApiCodegenToolWindowPanel(Project project) {
        super(true, true);
        this.project = project;
        this.projectService = ApiCodegenProjectService.getInstance(project);

        initializeUI();
        loadYamlFiles();
    }

    private void initializeUI() {
        setLayout(new BorderLayout());

        // Main panel with vertical layout
        JPanel mainPanel = new JPanel();
        mainPanel.setLayout(new VerticalFlowLayout(VerticalFlowLayout.TOP, 10, 10, true, false));
        mainPanel.setBackground(JBColor.background());

        // Header
        JLabel titleLabel = new JLabel(ApiCodegenPlugin.PLUGIN_NAME);
        titleLabel.setFont(new Font(Font.DIALOG, Font.BOLD, 16));
        titleLabel.setForeground(JBColor.foreground());
        mainPanel.add(createTitledPanel("API YAML", titleLabel));

        // YAML File Selection
        mainPanel.add(createYamlSelectionPanel());

        // Toolbar
        mainPanel.add(createToolbarPanel());

        // Issues Panel
        mainPanel.add(createIssuesPanel());

        // Generation Options
        mainPanel.add(createGenerationPanel());

        // Log Panel
        mainPanel.add(createLogPanel());

        // Add to scroll pane
        JBScrollPane scrollPane = new JBScrollPane(mainPanel);
        scrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);
        scrollPane.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        add(scrollPane, BorderLayout.CENTER);
    }

    private JPanel createTitledPanel(String title, JComponent content) {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(JBColor.background());
        panel.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(JBColor.border()),
                title,
                0,
                0,
                null,
                JBColor.foreground()
        ));
        panel.add(content, BorderLayout.CENTER);
        return panel;
    }

    private JPanel createYamlSelectionPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 0));
        panel.setBackground(JBColor.background());
        panel.setBorder(new EmptyBorder(5, 5, 5, 5));

        // Label
        JLabel label = new JLabel("YAML 文件:");
        label.setForeground(JBColor.foreground());
        panel.add(label, BorderLayout.WEST);

        // Combo box for auto-detected files
        yamlFileComboBox = new JComboBox<>();
        yamlFileComboBox.setBackground(JBColor.background());
        yamlFileComboBox.setForeground(JBColor.foreground());
        yamlFileComboBox.addItem("--- 选择 YAML 文件 ---");
        panel.add(yamlFileComboBox, BorderLayout.CENTER);

        // Refresh button
        refreshButton = new JButton("刷新");
        refreshButton.setBackground(JBColor.background());
        refreshButton.setForeground(JBColor.foreground());
        refreshButton.addActionListener(e -> loadYamlFiles());
        panel.add(refreshButton, BorderLayout.EAST);

        return panel;
    }

    private JPanel createToolbarPanel() {
        JPanel panel = new JPanel(new FlowLayout(FlowLayout.LEFT, 5, 0));
        panel.setBackground(JBColor.background());

        analyzeButton = new JButton("分析");
        analyzeButton.setBackground(JBColor.background());
        analyzeButton.setForeground(JBColor.foreground());
        analyzeButton.addActionListener(e -> analyzeYaml());
        panel.add(analyzeButton);

        autoFixButton = new JButton("修复");
        autoFixButton.setBackground(JBColor.background());
        autoFixButton.setForeground(JBColor.foreground());
        autoFixButton.addActionListener(e -> autoFixYaml());
        panel.add(autoFixButton);

        generateButton = new JButton("生成");
        generateButton.setBackground(JBColor.background());
        generateButton.setForeground(JBColor.foreground());
        generateButton.addActionListener(e -> generateCode());
        panel.add(generateButton);

        return panel;
    }

    private JPanel createIssuesPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(JBColor.background());
        panel.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(JBColor.border()),
                "校验问题",
                0,
                0,
                null,
                JBColor.foreground()
        ));

        // Table model
        String[] columnNames = {"类型", "严重级别", "字段", "建议修复"};
        issueTableModel = new DefaultTableModel(columnNames, 0) {
            @Override
            public boolean isCellEditable(int row, int column) {
                return false;
            }
        };
        issueTable = new JBTable(issueTableModel);
        issueTable.setBackground(JBColor.background());
        issueTable.setForeground(JBColor.foreground());
        issueTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);

        JBScrollPane scrollPane = new JBScrollPane(issueTable);
        scrollPane.setPreferredSize(new Dimension(0, 150));
        panel.add(scrollPane, BorderLayout.CENTER);

        return panel;
    }

    private JPanel createGenerationPanel() {
        JPanel panel = new JPanel(new GridLayout(0, 1, 5, 5));
        panel.setBackground(JBColor.background());
        panel.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(JBColor.border()),
                "代码生成",
                0,
                0,
                null,
                JBColor.foreground()
        ));

        // Checkboxes
        generateControllerCheck = new JCheckBox("Controller -> generated/api/ (手动复制)", false);
        generateControllerCheck.setBackground(JBColor.background());
        generateControllerCheck.setForeground(JBColor.foreground());

        generateRequestCheck = new JCheckBox("Request -> src/main/java/req/ (覆盖)", true);
        generateRequestCheck.setBackground(JBColor.background());
        generateRequestCheck.setForeground(JBColor.foreground());

        generateResponseCheck = new JCheckBox("Response -> src/main/java/rsp/ (覆盖)", true);
        generateResponseCheck.setBackground(JBColor.background());
        generateResponseCheck.setForeground(JBColor.foreground());

        panel.add(generateControllerCheck);
        panel.add(generateRequestCheck);
        panel.add(generateResponseCheck);

        return panel;
    }

    private JPanel createLogPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBackground(JBColor.background());
        panel.setBorder(BorderFactory.createTitledBorder(
                BorderFactory.createLineBorder(JBColor.border()),
                "输出日志",
                0,
                0,
                null,
                JBColor.foreground()
        ));

        logArea = new JTextArea(8, 50);
        logArea.setBackground(JBColor.background());
        logArea.setForeground(JBColor.foreground());
        logArea.setEditable(false);
        logArea.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 11));

        JBScrollPane scrollPane = new JBScrollPane(logArea);
        scrollPane.setPreferredSize(new Dimension(0, 120));
        panel.add(scrollPane, BorderLayout.CENTER);

        return panel;
    }

    private void loadYamlFiles() {
        yamlFileComboBox.removeAllItems();
        yamlFileComboBox.addItem("--- 选择 YAML 文件 ---");

        // Load from project root
        var yamlFiles = projectService.findYamlFiles();
        for (String file : yamlFiles) {
            yamlFileComboBox.addItem(file);
        }

        log("已扫描 " + yamlFiles.size() + " 个 YAML 文件");
    }

    private String getSelectedYamlPath() {
        String selectedFile = (String) yamlFileComboBox.getSelectedItem();
        if (selectedFile == null || selectedFile.startsWith("---")) {
            return null;
        }

        String basePath = project.getBasePath();
        if (basePath == null) {
            return null;
        }

        return basePath + File.separator + selectedFile;
    }

    private void analyzeYaml() {
        String yamlPath = getSelectedYamlPath();
        if (yamlPath == null) {
            log("请先选择一个 YAML 文件");
            return;
        }

        File yamlFile = new File(yamlPath);
        if (!yamlFile.exists()) {
            log("文件不存在: " + yamlPath);
            return;
        }

        log("开始分析: " + yamlFile.getName());

        try {
            // Parse YAML
            ApiDefinition apiDef = YamlParser.parse(yamlPath);

            // Validate
            ApiValidator validator = new ApiValidator();
            var result = validator.validate(apiDef);

            // Clear existing issues
            issueTableModel.setRowCount(0);

            int errorCount = 0;
            int warnCount = 0;

            for (ValidationError error : result.getErrors()) {
                String type = error.getSeverity().name();
                String severity = getSeverityDescription(error.getSeverity());
                String field = error.getFieldPath();
                String fix = error.getFix() != null ? error.getFix() : "";

                issueTableModel.addRow(new Object[]{type, severity, field, fix});

                if ("ERROR".equals(type)) {
                    errorCount++;
                } else if ("WARN".equals(type)) {
                    warnCount++;
                }
            }

            // Also check for missing validations
            List<String> validationIssues = checkMissingValidations(yamlPath);
            for (String issue : validationIssues) {
                issueTableModel.addRow(new Object[]{"WARN", "建议修复", issue, "添加校验规则"});
                warnCount++;
            }

            log("分析完成: " + errorCount + " 个错误, " + warnCount + " 个警告");

        } catch (Exception e) {
            log("分析失败: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String getSeverityDescription(com.apicgen.validator.Severity severity) {
        return switch (severity) {
            case ERROR -> "错误-必须修复";
            case WARN -> "警告-建议修复";
            case INFO -> "信息";
        };
    }

    private List<String> checkMissingValidations(String yamlPath) {
        List<String> issues = new ArrayList<>();

        try {
            // Use ValidationFixer to check for missing validations
            issues = ValidationFixer.checkMissingValidations(yamlPath);
        } catch (Exception e) {
            log("校验检查失败: " + e.getMessage());
        }

        return issues;
    }

    private void autoFixYaml() {
        String yamlPath = getSelectedYamlPath();
        if (yamlPath == null) {
            log("请先选择一个 YAML 文件");
            return;
        }

        // Get issues to fix
        List<String> fixDescriptions = new ArrayList<>();
        int rowCount = issueTableModel.getRowCount();
        for (int i = 0; i < rowCount; i++) {
            Object fix = issueTableModel.getValueAt(i, 3);
            if (fix != null && !fix.toString().isEmpty()) {
                fixDescriptions.add("[" + issueTableModel.getValueAt(i, 2) + "] " + fix);
            }
        }

        if (fixDescriptions.isEmpty()) {
            log("没有需要修复的问题");
            return;
        }

        // Show confirmation dialog
        AutoFixConfirmDialog dialog = new AutoFixConfirmDialog(fixDescriptions);
        if (!dialog.showAndGet()) {
            log("已取消修复");
            return;
        }

        log("开始修复: " + yamlPath);

        try {
            // Backup original file
            File original = new File(yamlPath);
            File backup = new File(yamlPath + ".backup");
            Files.copy(original.toPath(), backup.toPath());
            log("已备份原文件: " + backup.getName());

            // Apply fixes
            String fixedYaml = ValidationFixer.autoFix(yamlPath);
            if (fixedYaml != null) {
                Files.writeString(original.toPath(), fixedYaml);
                log("修复完成!");
                log("请查看 git diff 确认修改");

                // Refresh project
                projectService.refreshProject();

                // Re-analyze
                analyzeYaml();
            } else {
                log("修复失败");
            }
        } catch (Exception e) {
            log("修复失败: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void generateCode() {
        String yamlPath = getSelectedYamlPath();
        if (yamlPath == null) {
            log("请先选择一个 YAML 文件");
            return;
        }

        // Check what to generate
        boolean generateController = generateControllerCheck.isSelected();
        boolean generateRequest = generateRequestCheck.isSelected();
        boolean generateResponse = generateResponseCheck.isSelected();

        if (!generateController && !generateRequest && !generateResponse) {
            log("请至少选择一个要生成的文件类型");
            return;
        }

        // For Req/Rsp, show confirmation dialog
        if (generateRequest || generateResponse) {
            List<String> filesToOverwrite = new ArrayList<>();

            // Check for existing files (simplified check)
            if (generateRequest) {
                filesToOverwrite.add("Request 文件 (覆盖)");
            }
            if (generateResponse) {
                filesToOverwrite.add("Response 文件 (覆盖)");
            }

            GenerateConfirmDialog dialog = new GenerateConfirmDialog(filesToOverwrite);
            if (!dialog.showAndGet()) {
                log("已取消生成");
                return;
            }
        }

        log("开始生成代码: " + yamlPath);

        try {
            // Load config
            String configPath = project.getBasePath() + "/codegen-config.yaml";
            GeneratorConfig config = ConfigLoader.load(configPath);

            if (config == null) {
                // Use default config
                config = new GeneratorConfig();
                config.setFrameworkType(FrameworkType.CXF);
                config.setBasePackage("com.example");
            }

            // Generate code
            ApiCodegenCore core = new ApiCodegenCore();
            core.generate(yamlPath, config);

            log("代码生成完成!");

            // Refresh project to show new files
            projectService.refreshProject();

        } catch (Exception e) {
            log("生成失败: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void log(String message) {
        logArea.append(message + "\n");
        logArea.setCaretPosition(logArea.getDocument().getLength());
    }

    @Override
    public void dispose() {
        // Cleanup
    }
}
