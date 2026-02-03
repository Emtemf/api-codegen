package com.apicgen.model;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 字段定义
 */
@Data
public class FieldDefinition {

    /**
     * 字段名
     */
    private String name;

    /**
     * 字段类型
     */
    private String type;

    /**
     * 是否必填
     */
    private boolean required = false;

    /**
     * 描述
     */
    private String description;

    /**
     * 校验规则
     */
    private ValidationConfig validation;

    /**
     * 嵌套对象字段列表（当 type 是自定义对象时）
     */
    private List<FieldDefinition> fields;

    /**
     * 枚举值（当 type 是 Enum 时）
     */
    private List<Object> enumValues;

    public FieldDefinition() {
    }

    public FieldDefinition(String name, String type) {
        this.name = name;
        this.type = type;
    }

    /**
     * 是否是基本类型
     */
    public boolean isPrimitiveType() {
        switch (type) {
            case "String":
            case "Integer":
            case "Long":
            case "Double":
            case "Boolean":
            case "LocalDate":
            case "LocalDateTime":
            case "Date":
                return true;
            default:
                return false;
        }
    }

    /**
     * 是否是枚举类型
     */
    public boolean isEnumType() {
        return "Enum".equals(type) || enumValues != null && !enumValues.isEmpty();
    }

    /**
     * 是否是列表类型
     */
    public boolean isListType() {
        return type != null && type.startsWith("List<");
    }

    /**
     * 是否是嵌套列表（如 List<List<T>>）
     */
    public boolean isNestedListType() {
        if (!isListType()) {
            return false;
        }
        String innerType = getGenericType();
        return innerType != null && innerType.startsWith("List<");
    }

    /**
     * 获取泛型类型
     */
    public String getGenericType() {
        if (type == null || !type.contains("<")) {
            return null;
        }
        int start = type.indexOf("<");
        int end = type.lastIndexOf(">");
        if (start >= 0 && end > start) {
            return type.substring(start + 1, end);
        }
        return null;
    }

    /**
     * 是否是对象类型（非基本类型、非枚举、非列表）
     */
    public boolean isObjectType() {
        return !isPrimitiveType() && !isEnumType() && !isListType();
    }
}
