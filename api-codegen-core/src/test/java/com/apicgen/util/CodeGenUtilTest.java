package com.apicgen.util;

import com.apicgen.model.ClassDefinition;
import com.apicgen.model.FieldDefinition;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * CodeGenUtil 单元测试
 *
 * 测试场景：
 * - 字符串工具方法（驼峰转换、大小写转换）
 * - Java类型处理（类名、包导入）
 * - 循环引用检测
 * - 枚举值类型处理
 */
class CodeGenUtilTest {

    @Nested
    @DisplayName("should_convert_camel_to_snake")
    class ShouldConvertCamelToSnake {

        /**
         * 测试场景：普通驼峰字符串转下划线
         * 预期结果：驼峰转换为小写下划线，每个大写字母前添加下划线
         * 实际结果："camelCase" -> "camel_case"
         */
        @Test
        @DisplayName("should_convert_simple_camel_to_snake")
        void shouldConvertSimpleCamelToSnake() {
            // Given
            String camelCase = "camelCase";

            // When
            String result = CodeGenUtil.camelToSnake(camelCase);

            // Then
            assertEquals("camel_case", result);
        }

        /**
         * 测试场景：多个大写字母的驼峰字符串
         * 预期结果：每个大写字母前添加下划线并转为小写
         * 实际结果："XMLParser" -> "x_m_l_parser"
         */
        @Test
        @DisplayName("should_convert_multiple_uppercase_camel_to_snake")
        void shouldConvertMultipleUppercaseCamelToSnake() {
            // Given
            String camelCase = "XMLParser";

            // When
            String result = CodeGenUtil.camelToSnake(camelCase);

            // Then
            assertEquals("x_m_l_parser", result);
        }

        /**
         * 测试场景：全小写字符串
         * 预期结果：返回原字符串
         * 实际结果："lowercase" -> "lowercase"
         */
        @Test
        @DisplayName("should_return_lowercase_unchanged")
        void shouldReturnLowercaseUnchanged() {
            // Given
            String input = "lowercase";

            // When
            String result = CodeGenUtil.camelToSnake(input);

            // Then
            assertEquals("lowercase", result);
        }

        /**
         * 测试场景：单个字符
         * 预期结果：返回小写字符
         * 实际结果："A" -> "a"
         */
        @Test
        @DisplayName("should_convert_single_char_to_lower")
        void shouldConvertSingleCharToLower() {
            // Given
            String input = "A";

            // When
            String result = CodeGenUtil.camelToSnake(input);

            // Then
            assertEquals("a", result);
        }

        /**
         * 测试场景：空字符串
         * 预期结果：返回空字符串
         * 实际结果："" -> ""
         */
        @Test
        @DisplayName("should_return_empty_string")
        void shouldReturnEmptyString() {
            // Given
            String input = "";

            // When
            String result = CodeGenUtil.camelToSnake(input);

            // Then
            assertEquals("", result);
        }

        /**
         * 测试场景：null输入
         * 预期结果：返回null
         * 实际结果：null -> null
         */
        @Test
        @DisplayName("should_return_null_for_null_input")
        void shouldReturnNullForNullInput() {
            // Given
            String input = null;

            // When
            String result = CodeGenUtil.camelToSnake(input);

            // Then
            assertNull(result);
        }
    }

    @Nested
    @DisplayName("should_capitalize_string")
    class ShouldCapitalizeString {

        /**
         * 测试场景：普通字符串首字母大写
         * 预期结果：首字母转换为大写
         * 实际结果："hello" -> "Hello"
         */
        @Test
        @DisplayName("should_capitalize_first_letter")
        void shouldCapitalizeFirstLetter() {
            // Given
            String input = "hello";

            // When
            String result = CodeGenUtil.capitalize(input);

            // Then
            assertEquals("Hello", result);
        }

        /**
         * 测试场景：已大写的字符串
         * 预期结果：返回原字符串
         * 实际结果："Hello" -> "Hello"
         */
        @Test
        @DisplayName("should_return_already_capitalized_string")
        void shouldReturnAlreadyCapitalizedString() {
            // Given
            String input = "Hello";

            // When
            String result = CodeGenUtil.capitalize(input);

            // Then
            assertEquals("Hello", result);
        }

        /**
         * 测试场景：单个字符
         * 预期结果：返回原字符
         * 实际结果："a" -> "A"
         */
        @Test
        @DisplayName("should_capitalize_single_char")
        void shouldCapitalizeSingleChar() {
            // Given
            String input = "a";

            // When
            String result = CodeGenUtil.capitalize(input);

            // Then
            assertEquals("A", result);
        }

        /**
         * 测试场景：空字符串
         * 预期结果：返回空字符串
         * 实际结果："" -> ""
         */
        @Test
        @DisplayName("should_return_empty_string")
        void shouldReturnEmptyString() {
            // Given
            String input = "";

            // When
            String result = CodeGenUtil.capitalize(input);

            // Then
            assertEquals("", result);
        }

        /**
         * 测试场景：null输入
         * 预期结果：返回null
         * 实际结果：null -> null
         */
        @Test
        @DisplayName("should_return_null_for_null_input")
        void shouldReturnNullForNullInput() {
            // Given
            String input = null;

            // When
            String result = CodeGenUtil.capitalize(input);

            // Then
            assertNull(result);
        }
    }

    @Nested
    @DisplayName("should_uncapitalize_string")
    class ShouldUncapitalizeString {

        /**
         * 测试场景：普通字符串首字母小写
         * 预期结果：首字母转换为小写
         * 实际结果："Hello" -> "hello"
         */
        @Test
        @DisplayName("should_uncapitalize_first_letter")
        void shouldUncapitalizeFirstLetter() {
            // Given
            String input = "Hello";

            // When
            String result = CodeGenUtil.uncapitalize(input);

            // Then
            assertEquals("hello", result);
        }

        /**
         * 测试场景：已小写的字符串
         * 预期结果：返回原字符串
         * 实际结果："hello" -> "hello"
         */
        @Test
        @DisplayName("should_return_already_lowercase_string")
        void shouldReturnAlreadyLowercaseString() {
            // Given
            String input = "hello";

            // When
            String result = CodeGenUtil.uncapitalize(input);

            // Then
            assertEquals("hello", result);
        }

        /**
         * 测试场景：单个字符
         * 预期结果：返回原字符
         * 实际结果："A" -> "a"
         */
        @Test
        @DisplayName("should_uncapitalize_single_char")
        void shouldUncapitalizeSingleChar() {
            // Given
            String input = "A";

            // When
            String result = CodeGenUtil.uncapitalize(input);

            // Then
            assertEquals("a", result);
        }

        /**
         * 测试场景：空字符串
         * 预期结果：返回空字符串
         * 实际结果："" -> ""
         */
        @Test
        @DisplayName("should_return_empty_string")
        void shouldReturnEmptyString() {
            // Given
            String input = "";

            // When
            String result = CodeGenUtil.uncapitalize(input);

            // Then
            assertEquals("", result);
        }

        /**
         * 测试场景：null输入
         * 预期结果：返回null
         * 实际结果：null -> null
         */
        @Test
        @DisplayName("should_return_null_for_null_input")
        void shouldReturnNullForNullInput() {
            // Given
            String input = null;

            // When
            String result = CodeGenUtil.uncapitalize(input);

            // Then
            assertNull(result);
        }
    }

    @Nested
    @DisplayName("should_get_java_class_name")
    class ShouldGetJavaClassName {

        /**
         * 测试场景：基本类型获取类名
         * 预期结果：返回正确的Java类名
         * 实际结果：Integer->Integer, Long->Long, Double->Double, Boolean->Boolean
         */
        @Test
        @DisplayName("should_return_correct_class_name_for_primitives")
        void shouldReturnCorrectClassNameForPrimitives() {
            assertEquals("Integer", CodeGenUtil.getJavaClassName("Integer"));
            assertEquals("Long", CodeGenUtil.getJavaClassName("Long"));
            assertEquals("Double", CodeGenUtil.getJavaClassName("Double"));
            assertEquals("Boolean", CodeGenUtil.getJavaClassName("Boolean"));
            assertEquals("String", CodeGenUtil.getJavaClassName("String"));
        }

        /**
         * 测试场景：日期类型获取类名
         * 预期结果：返回正确的Java日期类名
         * 实际结果：LocalDate->LocalDate, LocalDateTime->LocalDateTime, Date->Date
         */
        @Test
        @DisplayName("should_return_correct_class_name_for_date_types")
        void shouldReturnCorrectClassNameForDateTypes() {
            assertEquals("LocalDate", CodeGenUtil.getJavaClassName("LocalDate"));
            assertEquals("LocalDateTime", CodeGenUtil.getJavaClassName("LocalDateTime"));
            assertEquals("Date", CodeGenUtil.getJavaClassName("Date"));
        }

        /**
         * 测试场景：自定义类型
         * 预期结果：返回原类型名称
         * 实际结果：CustomClass->CustomClass
         */
        @Test
        @DisplayName("should_return_custom_type_name")
        void shouldReturnCustomTypeName() {
            assertEquals("CustomClass", CodeGenUtil.getJavaClassName("CustomClass"));
            assertEquals("UserAddress", CodeGenUtil.getJavaClassName("UserAddress"));
        }
    }

    @Nested
    @DisplayName("should_get_java_type_package")
    class ShouldGetJavaTypePackage {

        /**
         * 测试场景：获取日期类型的包名
         * 预期结果：返回正确的包路径
         * 实际结果：LocalDate->java.time.LocalDate, LocalDateTime->java.time.LocalDateTime
         */
        @Test
        @DisplayName("should_return_package_for_date_types")
        void shouldReturnPackageForDateTypes() {
            assertEquals("java.time.LocalDate", CodeGenUtil.getJavaTypePackage("LocalDate"));
            assertEquals("java.time.LocalDateTime", CodeGenUtil.getJavaTypePackage("LocalDateTime"));
            assertEquals("java.util.Date", CodeGenUtil.getJavaTypePackage("Date"));
        }

        /**
         * 测试场景：获取List类型的包名
         * 预期结果：返回java.util.List
         * 实际结果：List->java.util.List
         */
        @Test
        @DisplayName("should_return_package_for_list_type")
        void shouldReturnPackageForListType() {
            assertEquals("java.util.List", CodeGenUtil.getJavaTypePackage("List"));
        }

        /**
         * 测试场景：基本类型无包名
         * 预期结果：返回null
         * 实际结果：String->null, Integer->null, Long->null
         */
        @Test
        @DisplayName("should_return_null_for_primitive_types")
        void shouldReturnNullForPrimitiveTypes() {
            assertNull(CodeGenUtil.getJavaTypePackage("String"));
            assertNull(CodeGenUtil.getJavaTypePackage("Integer"));
            assertNull(CodeGenUtil.getJavaTypePackage("Long"));
            assertNull(CodeGenUtil.getJavaTypePackage("Double"));
            assertNull(CodeGenUtil.getJavaTypePackage("Boolean"));
        }

        /**
         * 测试场景：自定义类型无包名
         * 预期结果：返回null
         * 实际结果：CustomClass->null
         */
        @Test
        @DisplayName("should_return_null_for_custom_types")
        void shouldReturnNullForCustomTypes() {
            assertNull(CodeGenUtil.getJavaTypePackage("CustomClass"));
        }
    }

    @Nested
    @DisplayName("should_detect_circular_reference")
    class ShouldDetectCircularReference {

        /**
         * 测试场景：基本类型无循环引用
         * 预期结果：返回false
         * 实际结果：String字段无循环引用
         */
        @Test
        @DisplayName("should_return_false_for_primitive_type")
        void shouldReturnFalseForPrimitiveType() {
            // Given
            FieldDefinition field = new FieldDefinition("name", "String");

            // When
            boolean result = CodeGenUtil.hasCircularReference(field);

            // Then
            assertFalse(result);
        }

        /**
         * 测试场景：List类型无循环引用
         * 预期结果：返回false
         * 实际结果：List<String>字段无循环引用
         */
        @Test
        @DisplayName("should_return_false_for_list_type")
        void shouldReturnFalseForListType() {
            // Given
            FieldDefinition field = new FieldDefinition("items", "List<String>");

            // When
            boolean result = CodeGenUtil.hasCircularReference(field);

            // Then
            assertFalse(result);
        }

        /**
         * 测试场景：嵌套对象无循环引用
         * 预期结果：返回false
         * 实际结果：A包含B，B包含C，无循环
         */
        @Test
        @DisplayName("should_return_false_for_nested_objects_without_cycle")
        void shouldReturnFalseForNestedObjectsWithoutCycle() {
            // Given - A -> B -> C（无循环）
            FieldDefinition fieldC = new FieldDefinition("fieldC", "TypeC");
            fieldC.setFields(new ArrayList<>(List.of(
                new FieldDefinition("value", "String")
            )));

            FieldDefinition fieldB = new FieldDefinition("fieldB", "TypeB");
            fieldB.setFields(new ArrayList<>(List.of(fieldC)));

            FieldDefinition fieldA = new FieldDefinition("fieldA", "TypeA");
            fieldA.setFields(new ArrayList<>(List.of(fieldB)));

            // When
            boolean result = CodeGenUtil.hasCircularReference(fieldA);

            // Then
            assertFalse(result);
        }

        /**
         * 测试场景：A -> B -> A 循环引用
         * 预期结果：检测到循环引用，返回true
         * 实际结果：A包含B，B又包含A
         */
        @Test
        @DisplayName("should_detect_ab_circular_reference")
        void shouldDetectABCircularReference() {
            // Given - A -> B -> A
            FieldDefinition fieldB = new FieldDefinition("fieldB", "TypeB");
            FieldDefinition fieldA = new FieldDefinition("fieldA", "TypeA");

            // B包含A
            fieldB.setFields(new ArrayList<>(List.of(fieldA)));
            // A包含B
            fieldA.setFields(new ArrayList<>(List.of(fieldB)));

            // When
            boolean result = CodeGenUtil.hasCircularReference(fieldA);

            // Then
            assertTrue(result, "应该检测到A->B->A的循环引用");
        }

        /**
         * 测试场景：A -> B -> C -> A 三层循环
         * 预期结果：检测到循环引用，返回true
         * 实际结果：A包含B，B包含C，C包含A
         */
        @Test
        @DisplayName("should_detect_abc_circular_reference")
        void shouldDetectABCCircularReference() {
            // Given - A -> B -> C -> A
            FieldDefinition fieldA = new FieldDefinition("fieldA", "TypeA");
            FieldDefinition fieldB = new FieldDefinition("fieldB", "TypeB");
            FieldDefinition fieldC = new FieldDefinition("fieldC", "TypeC");

            // C包含A
            fieldC.setFields(new ArrayList<>(List.of(fieldA)));
            // B包含C
            fieldB.setFields(new ArrayList<>(List.of(fieldC)));
            // A包含B
            fieldA.setFields(new ArrayList<>(List.of(fieldB)));

            // When
            boolean result = CodeGenUtil.hasCircularReference(fieldA);

            // Then
            assertTrue(result, "应该检测到A->B->C->A的三层循环引用");
        }

        /**
         * 测试场景：null fields的无对象类型
         * 预期结果：返回false
         * 实际结果：isObjectType返回false，无循环引用
         */
        @Test
        @DisplayName("should_return_false_for_null_fields")
        void shouldReturnFalseForNullFields() {
            // Given
            FieldDefinition field = new FieldDefinition("custom", "CustomClass");
            // fields为null

            // When
            boolean result = CodeGenUtil.hasCircularReference(field);

            // Then
            assertFalse(result);
        }

        /**
         * 测试场景：空fields的无对象类型
         * 预期结果：返回false
         * 实际结果：fields为空列表，无循环引用
         */
        @Test
        @DisplayName("should_return_false_for_empty_fields")
        void shouldReturnFalseForEmptyFields() {
            // Given
            FieldDefinition field = new FieldDefinition("custom", "CustomClass");
            field.setFields(new ArrayList<>());

            // When
            boolean result = CodeGenUtil.hasCircularReference(field);

            // Then
            assertFalse(result);
        }
    }

    @Nested
    @DisplayName("should_get_enum_value_type")
    class ShouldGetEnumValueType {

        /**
         * 测试场景：字符串枚举值
         * 预期结果：返回String
         * 实际结果：["ADMIN", "USER"] -> "String"
         */
        @Test
        @DisplayName("should_return_string_for_string_enum_values")
        void shouldReturnStringForStringEnumValues() {
            // Given
            FieldDefinition field = new FieldDefinition("role", "Enum");
            field.setEnumValues(new ArrayList<>(List.of("ADMIN", "USER", "GUEST")));

            // When
            String result = CodeGenUtil.getEnumValueType(field);

            // Then
            assertEquals("String", result);
        }

        /**
         * 测试场景：整数枚举值
         * 预期结果：返回Integer
         * 实际结果：[1, 2, 3] -> "Integer"
         */
        @Test
        @DisplayName("should_return_integer_for_integer_enum_values")
        void shouldReturnIntegerForIntegerEnumValues() {
            // Given
            FieldDefinition field = new FieldDefinition("status", "Enum");
            field.setEnumValues(new ArrayList<>(List.of(1, 2, 3)));

            // When
            String result = CodeGenUtil.getEnumValueType(field);

            // Then
            assertEquals("Integer", result);
        }

        /**
         * 测试场景：空枚举值
         * 预期结果：返回String（默认）
         * 实际结果：[] -> "String"
         */
        @Test
        @DisplayName("should_return_string_for_empty_enum_values")
        void shouldReturnStringForEmptyEnumValues() {
            // Given
            FieldDefinition field = new FieldDefinition("status", "Enum");
            field.setEnumValues(new ArrayList<>());

            // When
            String result = CodeGenUtil.getEnumValueType(field);

            // Then
            assertEquals("String", result);
        }

        /**
         * 测试场景：null枚举值
         * 预期结果：返回String（默认）
         * 实际结果：null -> "String"
         */
        @Test
        @DisplayName("should_return_string_for_null_enum_values")
        void shouldReturnStringForNullEnumValues() {
            // Given
            FieldDefinition field = new FieldDefinition("status", "Enum");
            field.setEnumValues(null);

            // When
            String result = CodeGenUtil.getEnumValueType(field);

            // Then
            assertEquals("String", result);
        }
    }

    @Nested
    @DisplayName("should_format_now")
    class ShouldFormatNow {

        /**
         * 测试场景：格式化当前时间
         * 预期结果：返回格式化的日期时间字符串
         * 实际结果：格式为"yyyy-MM-dd HH:mm:ss"
         */
        @Test
        @DisplayName("should_return_formatted_datetime")
        void shouldReturnFormattedDatetime() {
            // Given
            String before = "2024-01-01 00:00:00"; // 假设测试不会在2000年之前运行

            // When
            String result = CodeGenUtil.formatNow();

            // Then
            assertNotNull(result);
            assertTrue(result.matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}"),
                "结果应该匹配日期时间格式: " + result);
        }
    }
}
