/**
 * API Codegen Web UI - YAML 分析器
 * 用于分析和验证 API YAML 定义
 * 支持 Swagger/OpenAPI 自动转换为自定义格式
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
            let parsed = jsyaml.load(yamlContent);
            if (!parsed) {
                this.addIssue('error', 'YAML 内容为空', 0);
                return this.issues;
            }

            // 检测 Swagger/OpenAPI 格式并转换
            if (this.isSwaggerFormat(yamlContent)) {
                this.addIssue('info', '✨ 检测到 Swagger/OpenAPI 格式，已自动转换为自定义格式', 0);
                parsed = this.convertSwaggerToCustom(parsed);
                // 继续分析转换后的内容
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
     * 转换 Swagger/OpenAPI 为自定义格式
     */
    convertSwaggerToCustom(swagger) {
        const apis = [];
        const basePath = swagger.basePath || '';

        // 获取 paths
        const paths = swagger.paths || {};
        for (const [path, methods] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(methods)) {
                const api = {
                    name: operation.operationId || this.generateApiName(method, path),
                    path: basePath + path,
                    method: method.toUpperCase(),
                    description: operation.summary || operation.description || ''
                };

                // 转换 parameters 到 request
                if (operation.parameters || operation.requestBody) {
                    api.request = {
                        className: this.toClassName(api.name, 'Req'),
                        fields: this.convertParametersToFields(operation)
                    };
                }

                // 转换 response
                if (operation.responses) {
                    const successResponse = this.findSuccessResponse(operation.responses);
                    if (successResponse) {
                        api.response = {
                            className: this.toClassName(api.name, 'Rsp'),
                            fields: this.convertResponseToFields(successResponse, swagger)
                        };
                    }
                }

                apis.push(api);
            }
        }

        return { apis };
    }

    /**
     * 转换 parameters/requestBody 为字段列表
     */
    convertParametersToFields(operation) {
        const fields = [];
        const paramMap = new Map();

        // 处理 parameters
        if (operation.parameters) {
            operation.parameters.forEach(param => {
                if (param.in === 'body' || param.in === 'formData') {
                    const schema = param.schema || {};
                    if (schema.$ref) {
                        // 引用类型
                        const refName = this.extractRefName(schema.$ref);
                        fields.push({
                            name: param.name || this.toCamelCase(refName),
                            type: refName,
                            required: param.required || false,
                            description: param.description || ''
                        });
                    } else {
                        fields.push({
                            name: param.name,
                            type: this.convertJsonType(schema.type || 'string', schema.format),
                            required: param.required || false,
                            description: param.description || ''
                        });
                    }
                } else if (param.in === 'path' || param.in === 'query') {
                    fields.push({
                        name: param.name,
                        type: this.convertJsonType(param.type || 'string', param.format),
                        required: param.required || false,
                        description: param.description || ''
                    });
                }
            });
        }

        // 处理 requestBody (OpenAPI 3.0)
        if (operation.requestBody && operation.requestBody.content) {
            const content = operation.requestBody.content['application/json'];
            if (content && content.schema) {
                if (content.schema.$ref) {
                    const refName = this.extractRefName(content.schema.$ref);
                    fields.push({
                        name: 'body',
                        type: refName,
                        required: operation.requestBody.required || false,
                        description: 'Request body'
                    });
                } else if (content.schema.properties) {
                    for (const [name, prop] of Object.entries(content.schema.properties)) {
                        const required = content.schema.required?.includes(name);
                        fields.push({
                            name,
                            type: this.convertJsonType(prop.type, prop.format),
                            required,
                            description: prop.description || ''
                        });
                    }
                }
            }
        }

        return fields;
    }

    /**
     * 转换 response 为字段列表
     */
    convertResponseToFields(response, swagger) {
        const fields = [];

        // OpenAPI 3.0
        if (response.content) {
            const content = response.content['application/json'];
            if (content && content.schema) {
                if (content.schema.$ref) {
                    const refName = this.extractRefName(content.schema.$ref);
                    fields.push({
                        name: 'data',
                        type: refName,
                        description: 'Response data'
                    });
                } else if (content.schema.properties) {
                    for (const [name, prop] of Object.entries(content.schema.properties)) {
                        fields.push({
                            name,
                            type: this.convertJsonType(prop.type, prop.format),
                            description: prop.description || ''
                        });
                    }
                } else if (content.schema.type === 'array' && content.schema.items) {
                    fields.push({
                        name: 'data',
                        type: 'List<' + this.convertJsonType(content.schema.items.type, content.schema.items.format) + '>',
                        description: 'Data list'
                    });
                }
            }
        }
        // Swagger 2.0
        else if (response.schema) {
            if (response.schema.$ref) {
                const refName = this.extractRefName(response.schema.$ref);
                fields.push({
                    name: 'data',
                    type: refName,
                    description: 'Response data'
                });
            } else if (response.schema.properties) {
                for (const [name, prop] of Object.entries(response.schema.properties)) {
                    fields.push({
                        name,
                        type: this.convertJsonType(prop.type, prop.format),
                        description: prop.description || ''
                    });
                }
            } else if (response.schema.type === 'array' && response.schema.items) {
                if (response.schema.items.$ref) {
                    const refName = this.extractRefName(response.schema.items.$ref);
                    fields.push({
                        name: 'data',
                        type: 'List<' + refName + '>',
                        description: 'Data list'
                    });
                } else {
                    fields.push({
                        name: 'data',
                        type: 'List<' + this.convertJsonType(response.schema.items.type, response.schema.items.format) + '>',
                        description: 'Data list'
                    });
                }
            }
        }

        // 如果没有字段，添加默认 success 字段
        if (fields.length === 0) {
            fields.push({
                name: 'success',
                type: 'Boolean',
                description: '操作是否成功'
            });
        }

        return fields;
    }

    /**
     * 查找成功的响应
     */
    findSuccessResponse(responses) {
        return responses['200'] || responses['201'] || responses['204'] ||
               Object.values(responses)[0];
    }

    /**
     * 提取 $ref 的名称
     */
    extractRefName(ref) {
        if (!ref) return 'Object';
        const idx = ref.lastIndexOf('/');
        return idx >= 0 ? ref.substring(idx + 1) : ref;
    }

    /**
     * 转换 JSON 类型为 Java 类型
     */
    convertJsonType(type, format) {
        if (!type) return 'String';

        const typeLower = type.toLowerCase();
        switch (typeLower) {
            case 'string':
                if (format === 'date-time') return 'LocalDateTime';
                if (format === 'date') return 'LocalDate';
                if (format === 'email') return 'String';
                return 'String';
            case 'integer':
            case 'int32':
                return 'Integer';
            case 'long':
            case 'int64':
                return 'Long';
            case 'number':
                if (format === 'double' || format === 'float') return 'Double';
                return 'Double';
            case 'boolean':
                return 'Boolean';
            case 'array':
                return 'List<Object>';
            default:
                return type.charAt(0).toUpperCase() + type.slice(1);
        }
    }

    /**
     * 生成 API 名称
     */
    generateApiName(method, path) {
        const name = path.replaceAll('/\\{([^}]+)\\}', '')
                          .replaceAll('^/', '')
                          .replaceAll('/', '_');
        if (name.isEmpty()) {
            name = 'root';
        }
        return method.toLowerCase() + name.charAt(0).toUpperCase() + name.slice(1);
    }

    /**
     * 转换为类名
     */
    toClassName(apiName, suffix) {
        const name = apiName.charAt(0).toUpperCase() + apiName.slice(1);
        return name + suffix;
    }

    /**
     * 转换为驼峰命名
     */
    toCamelCase(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
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
