/**
 * API Codegen Web UI - YAML 分析器
 * 用于分析和验证 API YAML 定义
 * 支持 Swagger/OpenAPI 直接分析和修复（不转换格式）
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

            // 检测格式并使用对应的分析器
            if (this.isSwaggerFormat(yamlContent)) {
                this.analyzeSwagger(parsed);
            } else {
                this.analyzeCustom(parsed);
            }

        } catch (e) {
            const line = this.getLineNumberFromError(e.message);
            this.addIssue('error', 'YAML 解析错误: ' + e.message, line);
        }

        return this.issues;
    }

    /**
     * 检测是否是 Swagger/OpenAPI 格式
     */
    isSwaggerFormat(content) {
        if (!content) return false;
        const lower = content.toLowerCase();
        return lower.includes('swagger:') ||
               lower.includes('openapi:') ||
               (lower.includes('info:') && lower.includes('paths:'));
    }

    /**
     * 分析自定义格式
     */
    analyzeCustom(parsed) {
        if (!parsed.apis) {
            this.addIssue('error', '缺少 apis 字段', 0);
            return;
        }

        parsed.apis.forEach((api, index) => {
            this.analyzeApi(api, index);
        });
    }

    /**
     * 分析 Swagger/OpenAPI 格式
     */
    analyzeSwagger(parsed) {
        if (!parsed.paths) {
            this.addIssue('error', '缺少 paths 字段', 0);
            return;
        }

        const basePath = parsed.basePath || '';
        const paths = parsed.paths || {};

        for (const [path, methods] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(methods)) {
                // 检查必需字段
                if (!operation.operationId) {
                    this.addIssue('warn', `API ${method.toUpperCase()} ${path} 缺少 operationId`, 0);
                }

                // 检查路径格式
                const fullPath = basePath + path;
                if (!fullPath.startsWith('/')) {
                    this.addIssue('error', `路径必须以 / 开头: ${fullPath}`, 0);
                } else if (fullPath.includes('//')) {
                    this.addIssue('error', `路径不能包含 //: ${fullPath}`, 0);
                }

                // 分析 parameters
                if (operation.parameters) {
                    operation.parameters.forEach((param, idx) => {
                        this.analyzeSwaggerParameter(param, fullPath, method.toUpperCase(), idx);
                    });
                }

                // 分析 requestBody
                if (operation.requestBody) {
                    this.analyzeRequestBody(operation.requestBody, fullPath, method.toUpperCase());
                }

                // 分析 responses
                if (operation.responses) {
                    this.analyzeResponses(operation.responses, fullPath, method.toUpperCase());
                }
            }
        }
    }

    /**
     * 分析 Swagger parameter
     */
    analyzeSwaggerParameter(param, path, method, index) {
        // 检查必需参数是否有描述
        if (param.required && !param.description) {
            this.addIssue('warn', `必填参数 ${param.name} 缺少 description`, 0, null, `${method} ${path} parameters[${index}]`);
        }

        // 检查参数类型
        if (!param.type && !param.schema) {
            this.addIssue('warn', `参数 ${param.name} 缺少类型定义`, 0, null, `${method} ${path} parameters[${index}]`);
        }
    }

    /**
     * 分析 requestBody
     */
    analyzeRequestBody(requestBody, path, method) {
        // 检查必需的 requestBody 是否有 description
        if (requestBody.required && !requestBody.description) {
            this.addIssue('warn', `requestBody 缺少 description`, 0, null, `${method} ${path}`);
        }
    }

    /**
     * 分析 responses
     */
    analyzeResponses(responses, path, method) {
        // 检查是否有成功的响应
        const hasSuccessResponse = ['200', '201', '204'].some(code => responses[code]);
        if (!hasSuccessResponse) {
            this.addIssue('warn', `API ${method} ${path} 缺少成功响应 (2xx)`, 0);
        }
    }

    /**
     * 分析单个 API（自定义格式）
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
        } else if (api.path.includes('//')) {
            this.addIssue('error', '路径不能包含 //', 0, apiIndex, 'path');
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
     * 分析字段（自定义格式）
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
            if (!parsed) {
                return yamlContent;
            }

            // 判断格式并使用对应的修复方法
            if (this.isSwaggerFormat(yamlContent)) {
                return this.fixSwagger(parsed);
            } else {
                return this.fixCustom(parsed);
            }

        } catch (e) {
            console.error('Fix error:', e);
            return yamlContent;
        }
    }

    /**
     * 修复自定义格式
     */
    fixCustom(parsed) {
        if (!parsed.apis) {
            return yamlContent;
        }

        parsed.apis.forEach((api) => {
            this.fixApi(api);
        });

        return jsyaml.dump(parsed, { indent: 2 });
    }

    /**
     * 修复 Swagger/OpenAPI 格式
     */
    fixSwagger(parsed) {
        // 修复 paths 中的路径格式
        const paths = parsed.paths || {};
        for (const [path, methods] of Object.entries(paths)) {
            // 修复路径包含 // 的问题
            if (path.includes('//')) {
                const fixedPath = path.replace(/\/+/g, '/');
                paths[fixedPath] = methods;
                if (fixedPath !== path) {
                    delete paths[path];
                    this.addInfoMessage(`修复路径: ${path} → ${fixedPath}`);
                }
            }

            // 修复每个 operation
            for (const [method, operation] of Object.entries(methods)) {
                this.fixSwaggerOperation(operation);
            }
        }

        return jsyaml.dump(parsed, { indent: 2 });
    }

    /**
     * 修复 Swagger operation
     */
    fixSwaggerOperation(operation) {
        // 确保 operationId 存在
        if (!operation.operationId && operation.summary) {
            operation.operationId = this.toOperationId(operation.summary);
        }

        // 确保有 description
        if (!operation.description && operation.summary) {
            operation.description = operation.summary;
        }

        // 确保有 parameters 的 description
        if (operation.parameters) {
            operation.parameters.forEach(param => {
                if (!param.description && param.name) {
                    param.description = this.toDescription(param.name);
                }
            });
        }

        // 确保有 requestBody 的 description
        if (operation.requestBody && !operation.requestBody.description) {
            operation.requestBody.description = 'Request body';
        }
    }

    /**
     * 修复单个 API（自定义格式）
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
     * 修复字段（自定义格式）
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

    /**
     * 添加信息消息
     */
    addInfoMessage(message) {
        // 可以选择是否显示修复信息
        console.log('[INFO] ' + message);
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
     * 转换为 operationId
     */
    toOperationId(summary) {
        // 处理中文和特殊字符
        return 'api' + Math.random().toString(36).substring(2, 8);
    }

    /**
     * 转换为 description
     */
    toDescription(name) {
        return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
    }
}

// Export for both browser and Node.js
if (typeof window !== 'undefined') {
    window.ApiYamlAnalyzer = ApiYamlAnalyzer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiYamlAnalyzer;
}
