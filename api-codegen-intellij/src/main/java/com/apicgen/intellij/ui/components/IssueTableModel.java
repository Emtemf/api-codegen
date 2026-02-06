package com.apicgen.intellij.ui.components;

import javax.swing.table.AbstractTableModel;

/**
 * Table model for displaying validation issues.
 */
public class IssueTableModel extends AbstractTableModel {
    private final String[] columnNames = {"类型", "严重级别", "字段", "建议修复"};
    private final java.util.List<IssueRow> issues = new java.util.ArrayList<>();

    @Override
    public int getRowCount() {
        return issues.size();
    }

    @Override
    public int getColumnCount() {
        return columnNames.length;
    }

    @Override
    public String getColumnName(int column) {
        return columnNames[column];
    }

    @Override
    public Object getValueAt(int rowIndex, int columnIndex) {
        IssueRow issue = issues.get(rowIndex);
        return switch (columnIndex) {
            case 0 -> issue.getType();
            case 1 -> issue.getSeverity();
            case 2 -> issue.getField();
            case 3 -> issue.getFix();
            default -> null;
        };
    }

    public void addIssue(IssueRow issue) {
        int index = issues.size();
        issues.add(issue);
        fireTableRowsInserted(index, index);
    }

    public void clearIssues() {
        issues.clear();
        fireTableDataChanged();
    }

    public java.util.List<IssueRow> getIssues() {
        return new java.util.ArrayList<>(issues);
    }

    /**
     * Represents a single validation issue row.
     */
    public static class IssueRow {
        private final String type;      // ERROR, WARN, INFO
        private final String severity;  // 严重级别描述
        private final String field;     // 字段名
        private final String fix;       // 建议修复

        public IssueRow(String type, String severity, String field, String fix) {
            this.type = type;
            this.severity = severity;
            this.field = field;
            this.fix = fix;
        }

        public String getType() {
            return type;
        }

        public String getSeverity() {
            return severity;
        }

        public String getField() {
            return field;
        }

        public String getFix() {
            return fix;
        }
    }
}
