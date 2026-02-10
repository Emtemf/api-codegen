package com.apicgen.intellij;

import com.intellij.openapi.action.AnAction;
import com.intellij.openapi.action.AnActionEvent;
import org.jetbrains.annotations.NotNull;

public class AnalyzeAction extends AnAction {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        // 简化版本：只打印日志
        System.out.println("Analyze action triggered");
    }
}
