package com.apicgen.util;

import com.apicgen.model.FieldDefinition;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.Set;

/**
 * 工具类
 */
public class CodeGenUtil {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * 驼峰转下划线
     */
    public static String camelToSnake(String camelCase) {
        if (camelCase == null || camelCase.isEmpty()) {
            return camelCase;
        }
        StringBuilder result = new StringBuilder();
        result.append(Character.toLowerCase(camelCase.charAt(0)));
        for (int i = 1; i < camelCase.length(); i++) {
            char c = camelCase.charAt(i);
            if (Character.isUpperCase(c)) {
                result.append('_');
                result.append(Character.toLowerCase(c));
            } else {
                result.append(c);
            }
        }
        return result.toString();
    }

    /**
     * 首字母大写
     */
    public static String capitalize(String str) {
        if (str == null || str.isEmpty()) {
            return str;
        }
        return Character.toUpperCase(str.charAt(0)) + (str.length() > 1 ? str.substring(1) : "");
    }

    /**
     * 首字母小写
     */
    public static String uncapitalize(String str) {
        if (str == null || str.isEmpty()) {
            return str;
        }
        return Character.toLowerCase(str.charAt(0)) + (str.length() > 1 ? str.substring(1) : "");
    }

    /**
     * 获取 Java 类型对应的类名
     */
    public static String getJavaClassName(String type) {
        switch (type) {
            case "Integer":
                return "Integer";
            case "Long":
                return "Long";
            case "Double":
                return "Double";
            case "Boolean":
                return "Boolean";
            case "String":
                return "String";
            case "Date":
                return "Date";
            case "LocalDate":
                return "LocalDate";
            case "LocalDateTime":
                return "LocalDateTime";
            default:
                return type; // 自定义对象类型
        }
    }

    /**
     * 获取 Java 类型对应的包导入
     */
    public static String getJavaTypePackage(String type) {
        switch (type) {
            case "Date":
                return "java.util.Date";
            case "LocalDate":
                return "java.time.LocalDate";
            case "LocalDateTime":
                return "java.time.LocalDateTime";
            case "List":
                return "java.util.List";
            case "String":
            case "Integer":
            case "Long":
            case "Double":
            case "Boolean":
                return null;
            default:
                return null; // 自定义对象类型，由调用方处理
        }
    }

    /**
     * 格式化当前时间
     */
    public static String formatNow() {
        return LocalDateTime.now().format(DATE_TIME_FORMATTER);
    }

    /**
     * 获取枚举值的类型
     */
    public static String getEnumValueType(FieldDefinition field) {
        if (field.getEnumValues() == null || field.getEnumValues().isEmpty()) {
            return "String";
        }
        Object firstValue = field.getEnumValues().get(0);
        if (firstValue instanceof Integer) {
            return "Integer";
        }
        return "String";
    }

    /**
     * 检查是否存在循环引用
     */
    public static boolean hasCircularReference(FieldDefinition field, Set<String> visited) {
        if (!field.isObjectType() || field.getFields() == null) {
            return false;
        }
        String className = field.getType();
        if (visited.contains(className)) {
            return true;
        }
        Set<String> newVisited = new HashSet<>(visited);
        newVisited.add(className);
        for (FieldDefinition childField : field.getFields()) {
            if (hasCircularReference(childField, newVisited)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 检查是否存在循环引用（重载方法）
     */
    public static boolean hasCircularReference(FieldDefinition field) {
        return hasCircularReference(field, new HashSet<>());
    }
}
