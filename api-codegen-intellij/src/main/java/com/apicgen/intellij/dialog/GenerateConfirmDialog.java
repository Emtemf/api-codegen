package com.apicgen.intellij.dialog;

import com.intellij.openapi.ui.DialogWrapper;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.List;

/**
 * Dialog for confirming code generation with overwrite options.
 */
public class GenerateConfirmDialog extends DialogWrapper {
    private final List<String> filesToOverwrite;
    private JTextArea filesTextArea;
    private JCheckBox backupCheckBox;

    public GenerateConfirmDialog(List<String> filesToOverwrite) {
        super(true);
        this.filesToOverwrite = filesToOverwrite;
        setTitle("确认生成代码");
        setOKButtonText("确认生成");
        setCancelButtonText("取消");
        init();
    }

    @Nullable
    @Override
    protected JComponent createCenterPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setPreferredSize(new Dimension(500, 250));

        String message = "<html><body>以下文件将被覆盖（Request/Response）：<br><b>注意：Controller 不会覆盖，请手动复制到业务目录</b></body></html>";
        JLabel messageLabel = new JLabel(message);
        panel.add(messageLabel, BorderLayout.NORTH);

        filesTextArea = new JTextArea();
        filesTextArea.setEditable(false);
        filesTextArea.setText(String.join("\n", filesToOverwrite));

        JScrollPane scrollPane = new JScrollPane(filesTextArea);
        panel.add(scrollPane, BorderLayout.CENTER);

        backupCheckBox = new JCheckBox("生成前自动备份现有文件", true);
        panel.add(backupCheckBox, BorderLayout.SOUTH);

        return panel;
    }

    public boolean shouldBackup() {
        return backupCheckBox.isSelected();
    }
}
