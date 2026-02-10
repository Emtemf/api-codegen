package com.apicgen.intellij;

import com.intellij.openapi.action.AnAction;
import com.intellij.openapi.action.AnActionEvent;
import org.jetbrains.annotations.NotNull;

public class GenerateCodeAction extends AnAction {
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        System.out.println("GenerateCode action triggered");
    }
}
