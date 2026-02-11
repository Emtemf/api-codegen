/**
 * API Codegen Web UI - YAML 分析器
 * 用于分析和验证 API YAML 定义
 */

class ApiYamlAnalyzer {
    constructor() {
        this.issues = [];
        this.yamlLines = [];
    }

    /**
     * 分析 YAML 定义
     */
    analyze(yamlContent) {
        this.issues = [];
        this.yamlLines = yamlContent.split('\n');

        try {
            const parsed = jsyaml.load(yamlContent);
            if (!parsed) {
                this.addIssue('error', 'YAML 内容为空', 0);
                return this.issues;
            }

            if (!parsed.apis) {
                this.addIssue('error', '缺少 apis 字段', 0);
                return this.issues;
            }

            parsed.apis.forEach((api, index) => {
                this.analyzeApi(api, index);
            });

        } catch (e) {
            const line = this.getLineNumberFromError(e.message);
            this.addIssue('error', 'YAML 解析错误: ' + e.message, line);
        }

        return this.issues;
    }

    /**
     * 添加问题
     */
    addIssue(severity, message, line, apiIndex, field) {
        this.issues.push({
            severity: severity,
            message: message,
            line: line,
            api: apiIndex,
            field: field
        });
    }

    /**
     * 从错误消息获取行号
     */
    getLineNumberFromError(errorMessage) {
        const match = errorMessage.match(/line (\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * 分析单个 API
     */
    analyzeApi(api, apiIndex) {
        // 检查必需字段
        if (!api.name) {
            this.addIssue('error', '缺少 API 名称 (name)', 0, apiIndex, 'name');
        }

        if (!api.path) {
            this.addIssue('error', '缺少 API 路径 (path)', 0, apiIndex, 'path');
        } else if (!api.path.startsWith('/')) {
            this.addIssue('error', '路径必须以 / 开头', 0, apiIndex, 'path');
        }

        if (!api.method) {
            this.addIssue('error', '缺少 HTTP 方法 (method)', 0, apiIndex, 'method');
        }

        // 检查 method 是否有效
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        if (api.method && !validMethods.includes(api.method.toUpperCase())) {
            this.addIssue('warn', 'HTTP 方法应该是: GET, POST, PUT, DELETE, PATCH', 0, apiIndex, 'method');
        }

        // 分析 Request 字段
        if (api.request && api.request.fields) {
            api.request.fields.forEach((field, fieldIndex) => {
                this.analyzeField(field, apiIndex, fieldIndex, 'request');
            });
        }

        // 分析 Response 字段
        if (api.response && api.response.fields) {
            api.response.fields.forEach((field, fieldIndex) => {
                this.analyzeField(field, apiIndex, fieldIndex, 'response');
            });
        }
    }

    /**
     * 分析字段
     */
    analyzeField(field, apiIndex, fieldIndex, type) {
        const fieldPath = type + '.fields[' + fieldIndex + ']';

        if (!field.name) {
            this.addIssue('error', '字段缺少名称 (name)', 0, apiIndex, fieldPath);
            return;
        }

        if (!field.type) {
            this.addIssue('error', '字段缺少类型 (type)', 0, apiIndex, fieldPath + '.name');
        }

        // 检查必填字段的校验
        if (field.required && (!field.validation || !field.validation.notNull)) {
            this.addIssue('error', '必填字段缺少 @NotNull 校验', 0, apiIndex, fieldPath + '.name');
        }

        // String 类型检查
        if (field.type === 'String') {
            const hasValidation = field.validation &&
                (field.validation.minLength || field.validation.maxLength ||
                 field.validation.pattern || field.validation.email);

            if (!hasValidation) {
                this.addIssue('warn', 'String 字段缺少长度或格式校验', 0, apiIndex, fieldPath + '.name');
            }

            if (field.validation && field.validation.minLength && field.validation.maxLength &&
                field.validation.minLength > field.validation.maxLength) {
                this.addIssue('error', 'minLength 不能大于 maxLength', 0, apiIndex, fieldPath + '.name');
            }
        }

        // 邮箱字段检查
        if ((field.name.includes('email') || field.name.includes('mail')) &&
            field.validation && !field.validation.email) {
            this.addIssue('warn', '邮箱字段建议添加 @Email 校验', 0, apiIndex, fieldPath + '.name');
        }

        // 电话字段检查
        if ((field.name.includes('phone') || field.name.includes('tel') || field.name.includes('mobile')) &&
            field.validation && !field.validation.pattern) {
            this.addIssue('warn', '电话字段建议添加正则校验 ^1[3-9]\\d{9}$', 0, apiIndex, fieldPath + '.name');
        }

        // 数值类型检查
        if ((field.type === 'Integer' || field.type === 'Long' || field.type === 'Double') &&
            field.validation) {
            if (field.validation.min !== undefined && field.validation.max !== undefined &&
                field.validation.min > field.validation.max) {
                this.addIssue('error', 'min 不能大于 max', 0, apiIndex, fieldPath + '.name');
            }

            if (field.validation.min === undefined && field.validation.max === undefined) {
                this.addIssue('warn', '数值字段缺少范围校验', 0, apiIndex, fieldPath + '.name');
            }
        }

        // List 类型检查
        if (field.type && field.type.startsWith('List') &&
            field.validation) {
            if (field.validation.minSize !== undefined && field.validation.maxSize !== undefined &&
                field.validation.minSize > field.validation.maxSize) {
                this.addIssue('error', 'minSize 不能大于 maxSize', 0, apiIndex, fieldPath + '.name');
            }

            if (field.validation.minSize === undefined || field.validation.maxSize === undefined) {
                this.addIssue('warn', 'List 字段缺少大小范围校验', 0, apiIndex, fieldPath + '.name');
            }
        }

        // 日期类型检查
        if ((field.type === 'LocalDate' || field.type === 'LocalDateTime') &&
            field.validation) {
            if (field.name.includes('birth') || field.name.includes('dob') || field.name.includes('birthday')) {
                if (!field.validation.past) {
                    this.addIssue('warn', '生日字段建议添加 @Past 校验', 0, apiIndex, fieldPath + '.name');
                }
            }
        }
    }

    /**
     * 自动修复问题
     */
    fix(yamlContent) {
        try {
            const parsed = jsyaml.load(yamlContent);
            if (!parsed || !parsed.apis) {
                return yamlContent;
            }

            parsed.apis.forEach((api) => {
                this.fixApi(api);
            });

            return jsyaml.dump(parsed, { indent: 2 });
        } catch (e) {
            console.error('Fix error:', e);
            return yamlContent;
        }
    }

    /**
     * 修复单个 API
     */
    fixApi(api) {
        if (api.request && api.request.fields) {
            api.request.fields.forEach((field) => {
                this.fixField(field);
            });
        }

        if (api.response && api.response.fields) {
            api.response.fields.forEach((field) => {
                this.fixField(field);
            });
        }
    }

    /**
     * 修复字段
     */
    fixField(field) {
        // 确保 validation 对象存在
        if (!field.validation) {
            field.validation = {};
        }

        // 必填字段添加 notNull
        if (field.required && !field.validation.notNull) {
            field.validation.notNull = true;
        }

        // String 类型默认添加长度校验
        if (field.type === 'String' &&
            !field.validation.minLength && !field.validation.maxLength &&
            !field.validation.pattern && !field.validation.email) {
            field.validation.minLength = 1;
            field.validation.maxLength = 255;
        }

        // 邮箱字段自动添加 email 校验
        if ((field.name.includes('email') || field.name.includes('mail')) &&
            !field.validation.email) {
            field.validation.email = true;
        }

        // 电话字段自动添加正则校验
        if ((field.name.includes('phone') || field.name.includes('tel') || field.name.includes('mobile')) &&
            !field.validation.pattern) {
            field.validation.pattern = '^1[3-9]\\d{9}$';
        }

        // 数值类型添加默认范围
        if ((field.type === 'Integer' || field.type === 'Long' || field.type === 'Double') &&
            field.validation.min === undefined && field.validation.max === undefined) {
            if (field.type === 'Double') {
                field.validation.min = 0.0;
                field.validation.max = 9999999999.0;
            } else if (field.type === 'Long') {
                field.validation.min = 0;
                field.validation.max = 9223372036854775807;
            } else {
                field.validation.min = 0;
                field.validation.max = 2147483647;
            }
        }

        // List 类型添加默认大小
        if (field.type && field.type.startsWith('List') &&
            field.validation.minSize === undefined && field.validation.maxSize === undefined) {
            field.validation.minSize = 1;
            field.validation.maxSize = 100;
        }

        // 生日字段自动添加 past 校验
        if ((field.type === 'LocalDate' || field.type === 'LocalDateTime') &&
            (field.name.includes('birth') || field.name.includes('dob') || field.name.includes('birthday')) &&
            !field.validation.past) {
            field.validation.past = true;
        }
    }
}

// Export for both browser and Node.js
if (typeof window !== 'undefined') {
    window.ApiYamlAnalyzer = ApiYamlAnalyzer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiYamlAnalyzer;
}
