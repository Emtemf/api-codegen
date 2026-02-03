package com.apicgen.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 类定义（用于 Req/Rsp）
 */
@Data
public class ClassDefinition {

    /**
     * 类名
     */
    private String className;

    /**
     * 字段列表
     */
    private List<FieldDefinition> fields = new ArrayList<>();

    public ClassDefinition() {
    }

    public ClassDefinition(String className) {
        this.className = className;
    }

    public ClassDefinition(String className, List<FieldDefinition> fields) {
        this.className = className;
        this.fields = fields;
    }
}
