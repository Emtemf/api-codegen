package com.apicgen.intellij.dialog;

import com.intellij.openapi.ui.DialogWrapper;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.List;

/**
 * Dialog for confirming auto-fix of validation issues.
 */
public class AutoFixConfirmDialog extends DialogWrapper {
    private final List<String> issues;
    private JTextArea issuesTextArea;

    public AutoFixConfirmDialog(List<String> issues) {
        super(true);
        this.issues = issues;
        setTitle("确认自动修复");
        setOKButtonText("确认修复");
        setCancelButtonText("取消");
        init();
    }

    @Nullable
    @Override
    protected JComponent createCenterPanel() {
        JPanel panel = new JPanel(new BorderLayout(10, 10));
        panel.setPreferredSize(new Dimension(500, 300));

        JLabel messageLabel = new JLabel("<html><body>以下校验问题将被修复：</body></html>");
        panel.add(messageLabel, BorderLayout.NORTH);

        issuesTextArea = new JTextArea();
        issuesTextArea.setEditable(false);
        issuesTextArea.setText(String.join("\n", issues));

        JScrollPane scrollPane = new JScrollPane(issuesTextArea);
        panel.add(scrollPane, BorderLayout.CENTER);

        return panel;
    }
}
