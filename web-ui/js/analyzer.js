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

        // 检测 YAML 语法问题：检查每个路径下的方法是否有重复
        for (const [path, methods] of Object.entries(paths)) {
            if (typeof methods !== 'object') continue;

            const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
            for (const method of httpMethods) {
                // 如果同一个方法变成数组，说明 YAML 中有重复的 key
                if (Array.isArray(methods[method])) {
                    this.addIssue('error', `路径 "${path}" 下有重复的 ${method.toUpperCase()} 方法，请检查 YAML 语法是否正确`, 0);
                    return; // 停止分析，防止数据丢失
                }
            }
        }

        // 收集所有路径的注解信息，用于一致性检查
        const pathAnnotations = {};

        for (const [path, methods] of Object.entries(paths)) {
            // 提取 path 级别的 x-java-class-annotations
            const pathClassAnnotations = methods['x-java-class-annotations'];
            pathAnnotations[path] = {
                classAnnotations: pathClassAnnotations || null,
                operations: []
            };

            for (const [method, operation] of Object.entries(methods)) {
                // 跳过非 HTTP 方法的字段（如 x-java-class-annotations）
                if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
                    continue;
                }

                // 检查必需字段
                if (!operation.operationId) {
                    this.addIssue('warn', `API ${method.toUpperCase()} ${path} 缺少 operationId`, 0);
                }

                // 记录操作级别的注解信息
                const methodAnnotations = operation['x-java-method-annotations'];
                const operationClassAnnotations = operation['x-java-class-annotations'];
                pathAnnotations[path].operations.push({
                    method: method,
                    methodAnnotations: methodAnnotations || null,
                    operationClassAnnotations: operationClassAnnotations || null
                });

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

        // DFX-020: 检查同一路径下类注解一致性
        this.checkAnnotationConsistency(pathAnnotations);
    }

    /**
     * 检查注解位置一致性 (DFX-020)
     */
    checkAnnotationConsistency(pathAnnotations) {
        for (const [path, pathInfo] of Object.entries(pathAnnotations)) {
            const operations = pathInfo.operations;
            if (operations.length <= 1) continue;

            // 获取 path 级别的类注解
            const pathClassAnnotations = pathInfo.classAnnotations;

            // 检查每个操作的注解是否一致
            for (const op of operations) {
                // 检查方法级别的 x-java-class-annotations 是否与 path 级别一致
                if (op.operationClassAnnotations) {
                    if (!pathClassAnnotations) {
                        this.addIssue('warn', `DFX-020: 路径 ${path} 的 ${op.method.toUpperCase()} 方法有 x-java-class-annotations，但 path 级别没有定义（需手动配置）`, 0);
                    } else if (!this.areArraysEqual(op.operationClassAnnotations, pathClassAnnotations)) {
                        const pathAnns = Array.isArray(pathClassAnnotations) ? pathClassAnnotations.join(', ') : JSON.stringify(pathClassAnnotations);
                        const methodAnns = Array.isArray(op.operationClassAnnotations) ? op.operationClassAnnotations.join(', ') : JSON.stringify(op.operationClassAnnotations);
                        this.addIssue('warn', `DFX-020: 路径 ${path} 下 ${op.method.toUpperCase()} 方法的 x-java-class-annotations 与 path 级别不一致（需手动统一配置）\n  path级别: [${pathAnns}]\n  方法级别: [${methodAnns}]`, 0);
                    }
                }
            }
        }
    }

    /**
     * 比较两个数组是否相等（忽略顺序）
     */
    areArraysEqual(arr1, arr2) {
        if (!arr1 || !arr2) return false;
        if (arr1.length !== arr2.length) return false;
        const set1 = new Set(arr1);
        const set2 = new Set(arr2);
        return set1.size === set2.size && [...set1].every(x => set2.has(x));
    }

    /**
     * 分析 Swagger parameter
     */
    analyzeSwaggerParameter(param, path, method, index) {
        const paramPath = `${method} ${path} parameters[${index}]`;
        const apiIdentifier = `${method.toUpperCase()} ${path}`;

        // 检查必需参数是否有描述（需手动处理）
        if (param.required && !param.description) {
            this.addIssue('warn', `必填参数 ${param.name} 缺少 description（需手动添加描述）`, 0, apiIdentifier, paramPath);
        }

        // 检查参数类型（Swagger默认是string，但建议明确声明）
        const paramType = param.type || (param.schema && param.schema.type);
        if (!paramType && !param.schema) {
            this.addIssue('warn', `参数 ${param.name} 缺少类型定义（默认视为 String）`, 0, apiIdentifier, paramPath);
        }

        // 获取参数的实际类型和校验规则
        const fieldName = (param.name || '').toLowerCase();

        // 检查必填参数的校验（@NotNull/@NotBlank）
        if (param.required) {
            const hasRequiredValidation = param.minNotNull ||
                param.minimum !== undefined ||
                param.minLength !== undefined ||
                (param.schema && (param.schema.minimum !== undefined || param.schema.minLength !== undefined));
            if (!hasRequiredValidation) {
                this.addIssue('warn', `必填参数 ${param.name} 缺少 @NotNull 校验`, 0, apiIdentifier, paramPath);
            }
        }

        // 检查 String 类型的校验规则
        if (paramType === 'string') {
            const hasStringValidation =
                param.minLength !== undefined ||
                param.maxLength !== undefined ||
                param.pattern !== undefined ||
                (param.schema && (param.schema.minLength !== undefined || param.schema.maxLength !== undefined || param.schema.pattern !== undefined));

            if (!hasStringValidation) {
                // 检查是否是邮箱字段
                if (fieldName.includes('email') || fieldName.includes('mail')) {
                    this.addIssue('info', `邮箱字段 ${param.name} 建议添加 @Email 校验`, 0, apiIdentifier, paramPath);
                }
                // 检查是否是电话字段
                else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
                    this.addIssue('info', `电话字段 ${param.name} 建议添加正则校验`, 0, apiIdentifier, paramPath);
                }
                // 普通 String 字段
                else {
                    this.addIssue('warn', `String 字段 ${param.name} 缺少长度校验`, 0, apiIdentifier, paramPath);
                }
            }

            // 检查 minLength > maxLength
            const minLen = param.minLength || (param.schema && param.schema.minLength);
            const maxLen = param.maxLength || (param.schema && param.schema.maxLength);
            if (minLen !== undefined && maxLen !== undefined && minLen > maxLen) {
                this.addIssue('error', `参数 ${param.name} 的 minLength(${minLen}) 不能大于 maxLength(${maxLen})（需手动修正）`, 0, apiIdentifier, paramPath);
            }
        }

        // 检查数值类型的校验规则
        if (paramType === 'integer' || paramType === 'number') {
            const hasNumericValidation =
                param.minimum !== undefined ||
                param.maximum !== undefined ||
                (param.schema && (param.schema.minimum !== undefined || param.schema.maximum !== undefined));

            if (!hasNumericValidation) {
                // 检查是否是分页参数
                if (fieldName === 'page' || fieldName === 'pageNum') {
                    this.addIssue('warn', `参数 ${param.name} 缺少范围校验 (建议 min:1, max:2147483647)`, 0, apiIdentifier, paramPath);
                }
                // 检查是否是分页大小参数
                else if (fieldName.includes('size') || fieldName.includes('limit') || fieldName === 'pageSize') {
                    this.addIssue('warn', `参数 ${param.name} 缺少范围校验 (建议 min:1, max:100)`, 0, apiIdentifier, paramPath);
                }
                // 检查是否是年龄参数
                else if (fieldName.includes('age')) {
                    this.addIssue('warn', `参数 ${param.name} 缺少范围校验 (建议 min:0, max:150)`, 0, apiIdentifier, paramPath);
                }
                // 检查是否是评分参数
                else if (fieldName.includes('score') || fieldName.includes('rate')) {
                    this.addIssue('warn', `参数 ${param.name} 缺少范围校验 (建议 min:0, max:100)`, 0, apiIdentifier, paramPath);
                }
                // 检查是否是金额参数
                else if (fieldName.includes('price') || fieldName.includes('amount') || fieldName.includes('total') || fieldName.includes('balance')) {
                    this.addIssue('warn', `参数 ${param.name} 缺少范围校验 (建议 min:0)`, 0, apiIdentifier, paramPath);
                }
                // 检查是否是路径参数
                else if (param.in === 'path') {
                    this.addIssue('warn', `路径参数 ${param.name} 缺少最小值校验 (建议 minimum:1)`, 0, apiIdentifier, paramPath);
                }
                // 普通数值参数
                else if (!fieldName.includes('id')) {
                    this.addIssue('warn', `数值字段 ${param.name} 缺少范围校验`, 0, apiIdentifier, paramPath);
                }
            }

            // 检查 min > max
            const minVal = param.minimum !== undefined ? param.minimum : (param.schema && param.schema.minimum);
            const maxVal = param.maximum !== undefined ? param.maximum : (param.schema && param.schema.maximum);
            if (minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
                this.addIssue('error', `参数 ${param.name} 的 minimum 不能大于 maximum`, 0, apiIdentifier, paramPath);
            }
        }

        // 检查日期类型字段 (Swagger format: type=string, format=date or format=date-time)
        if (paramType === 'string' && param.format) {
            const fieldName = param.name.toLowerCase();
            // 生日字段建议添加 @Past 校验
            if (param.format === 'date' || param.format === 'date-time') {
                if (fieldName.includes('birth') || fieldName.includes('dob')) {
                    this.addIssue('info', `生日字段建议添加 @Past 校验`, 0, apiIdentifier, paramPath);
                }
                // 预约/计划字段建议添加 @Future 校验
                if (fieldName.includes('appoint') || fieldName.includes('schedule') || fieldName.includes('startTime') || fieldName.includes('endTime')) {
                    this.addIssue('info', `计划/预约字段建议添加 @Future 校验`, 0, apiIdentifier, paramPath);
                }
            }
        }

        // 检查 List/Array 类型的校验规则
        if (paramType === 'array' || (param.schema && param.schema.type === 'array')) {
            const hasArrayValidation =
                param.minItems !== undefined ||
                param.maxItems !== undefined ||
                (param.schema && (param.schema.minItems !== undefined || param.schema.maxItems !== undefined));

            if (!hasArrayValidation) {
                this.addIssue('warn', `List 字段 ${param.name} 缺少大小校验`, 0, apiIdentifier, paramPath);
            }

            // 检查 minItems > maxItems
            const minItems = param.minItems || (param.schema && param.schema.minItems);
            const maxItems = param.maxItems || (param.schema && param.schema.maxItems);
            if (minItems !== undefined && maxItems !== undefined && minItems > maxItems) {
                this.addIssue('error', `参数 ${param.name} 的 minItems 不能大于 maxItems`, 0, apiIdentifier, paramPath);
            }
        }
    }

    /**
     * 分析 requestBody
     */
    analyzeRequestBody(requestBody, path, method) {
        const apiIdentifier = `${method} ${path}`;
        // 检查必需的 requestBody 是否有 description（需手动处理）
        if (requestBody.required && !requestBody.description) {
            this.addIssue('warn', `requestBody 缺少 description（需手动添加描述）`, 0, apiIdentifier, 'requestBody');
        }

        // 分析 requestBody 中的字段
        if (requestBody.content && requestBody.content['application/json']) {
            const schema = requestBody.content['application/json'].schema;
            if (schema) {
                this.analyzeSchemaFields(schema, path, method);
            }
        }
    }

    /**
     * 分析 schema 中的字段（用于 requestBody）
     */
    analyzeSchemaFields(schema, path, method) {
        const apiIdentifier = `${method} ${path}`;

        // 处理 $ref 引用
        if (schema.$ref) {
            const refName = schema.$ref.split('/').pop();
            // 尝试从 definitions/components 中获取
            const refSchema = this.getRefSchema(schema.$ref);
            if (refSchema) {
                this.analyzeSchemaFields(refSchema, path, method);
            }
            return;
        }

        // 处理直接定义的属性
        const properties = schema.properties;
        if (!properties) return;

        for (const [propName, propDef] of Object.entries(properties)) {
            const fieldName = propName.toLowerCase();
            const fieldPath = `${path}.${method}.requestBody.${propName}`;

            // 检查日期类型字段
            if (propDef.type === 'string' && propDef.format) {
                // 生日字段建议添加 @Past 校验
                if ((propDef.format === 'date' || propDef.format === 'date-time') &&
                    (fieldName.includes('birth') || fieldName.includes('dob') || fieldName.includes('birthday'))) {
                    this.addIssue('info', `生日字段 ${propName} 建议添加 @Past 校验`, 0, apiIdentifier, fieldPath);
                }
                // 预约/计划字段建议添加 @Future 校验
                if ((propDef.format === 'date' || propDef.format === 'date-time') &&
                    (fieldName.includes('appoint') || fieldName.includes('schedule') || fieldName.includes('startTime') || fieldName.includes('endTime'))) {
                    this.addIssue('info', `计划/预约字段 ${propName} 建议添加 @Future 校验`, 0, apiIdentifier, fieldPath);
                }
            }

            // 检查 String 类型字段的校验建议
            if (propDef.type === 'string') {
                const hasStringValidation = propDef.minLength !== undefined ||
                    propDef.maxLength !== undefined ||
                    propDef.pattern !== undefined;

                if (!hasStringValidation) {
                    // 检查是否是邮箱字段
                    if (fieldName.includes('email') || fieldName.includes('mail')) {
                        this.addIssue('info', `邮箱字段 ${propName} 建议添加 @Email 校验`, 0, apiIdentifier, fieldPath);
                    }
                    // 检查是否是电话字段
                    else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
                        this.addIssue('info', `电话字段 ${propName} 建议添加正则校验`, 0, apiIdentifier, fieldPath);
                    }
                    // 普通 String 字段 - 长度校验建议
                    else if (!propDef.format) {  // 不对有 format 的字段（如 date）建议长度校验
                        this.addIssue('warn', `String 字段 ${propName} 缺少长度校验`, 0, apiIdentifier, fieldPath);
                    }
                }

                // 检查 minLength > maxLength
                const minLen = propDef.minLength;
                const maxLen = propDef.maxLength;
                if (minLen !== undefined && maxLen !== undefined && minLen > maxLen) {
                    this.addIssue('error', `参数 ${propName} 的 minLength(${minLen}) 不能大于 maxLength(${maxLen})（需手动修正）`, 0, apiIdentifier, fieldPath);
                }
            }

            // 递归分析嵌套对象
            if (propDef.type === 'object' && propDef.properties) {
                this.analyzeSchemaFields(propDef, path, method);
            }

            // 分析数组成员
            if (propDef.type === 'array' && propDef.items) {
                if (propDef.items.type === 'object' && propDef.items.properties) {
                    this.analyzeSchemaFields(propDef.items, path, method);
                }
            }
        }
    }

    /**
     * 获取 $ref 引用的 schema
     */
    getRefSchema(ref) {
        // Swagger 2.0: #/definitions/xxx
        // OpenAPI 3.0: #/components/schemas/xxx
        const parts = ref.split('/');
        const refName = parts[parts.length - 1];

        // 尝试从 Swagger 2.0 definitions 获取
        if (this.yaml.definitions && this.yaml.definitions[refName]) {
            return this.yaml.definitions[refName];
        }

        // 尝试从 OpenAPI 3.0 components.schemas 获取
        if (this.yaml.components && this.yaml.components.schemas && this.yaml.components.schemas[refName]) {
            return this.yaml.components.schemas[refName];
        }

        return null;
    }

    /**
     * 分析 responses
     */
    analyzeResponses(responses, path, method) {
        const apiIdentifier = `${method} ${path}`;
        // 检查是否有成功的响应
        const hasSuccessResponse = ['200', '201', '204'].some(code => responses[code]);
        if (!hasSuccessResponse) {
            this.addIssue('warn', `API ${method} ${path} 缺少成功响应 (2xx)`, 0, apiIdentifier, 'responses');
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

        // 检查 annotations 字段格式
        if (api.annotations) {
            if (!Array.isArray(api.annotations)) {
                this.addIssue('error', 'annotations 必须是数组', 0, apiIndex, 'annotations');
            } else {
                api.annotations.forEach((ann, annIdx) => {
                    if (typeof ann !== 'string') {
                        this.addIssue('error', `annotations[${annIdx}] 必须是字符串`, 0, apiIndex, `annotations[${annIdx}]`);
                    }
                });
            }
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
                this.addIssue('error', `minLength(${field.validation.minLength}) 不能大于 maxLength(${field.validation.maxLength})（需手动修正）`, 0, apiIndex, fieldPath + '.name');
            }
        }

        // 邮箱字段检查
        if ((field.name.includes('email') || field.name.includes('mail')) &&
            field.validation && !field.validation.email) {
            this.addIssue('info', '邮箱字段建议添加 @Email 校验', 0, apiIndex, fieldPath + '.name');
        }

        // 电话字段检查
        if ((field.name.includes('phone') || field.name.includes('tel') || field.name.includes('mobile')) &&
            field.validation && !field.validation.pattern) {
            this.addIssue('info', '电话字段建议添加正则校验 ^1[3-9]\\d{9}$', 0, apiIndex, fieldPath + '.name');
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
                    this.addIssue('info', '生日字段建议添加 @Past 校验', 0, apiIndex, fieldPath + '.name');
                }
            }
            // 计划/预约字段建议添加 @Future 校验
            if (field.name.includes('appoint') || field.name.includes('schedule') || field.name.includes('startTime') || field.name.includes('endTime')) {
                if (!field.validation.future) {
                    this.addIssue('info', '计划/预约字段建议添加 @Future 校验', 0, apiIndex, fieldPath + '.name');
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
     * 选择性修复问题 - 只修复选中的问题
     */
    fixSelective(yamlContent, selectedIndices) {
        // 重置修复统计
        this.fixStats = {
            paramsFixed: 0,
            pathsFixed: 0
        };

        try {
            const parsed = jsyaml.load(yamlContent);
            if (!parsed) {
                return yamlContent;
            }

            const isSwagger = this.isSwaggerFormat(yamlContent);

            // 先分析获取所有问题
            this.issues = [];
            if (isSwagger) {
                this.analyzeSwagger(parsed);
            } else {
                this.analyzeCustom(parsed);
            }

            // 检查是否有不可修复的错误（YAML 语法错误），如果有则不修复
            // 可修复的错误包括：// 路径、路径不以 / 开头、缺少 operationId 等
            // 不可修复的错误：YAML 语法错误（如重复的 HTTP 方法）
            const hasUnfixableError = this.issues.some(i =>
                i.severity === 'error' &&
                (i.message.includes('重复的') || i.message.includes('YAML 语法'))
            );
            if (hasUnfixableError) {
                console.warn('检测到 YAML 语法错误，停止自动修复:', this.issues);
                return yamlContent;  // 不修复，直接返回原内容
            }

            // 收集需要修复的问题类型
            const selectedIssues = this.issues.filter((_, index) => selectedIndices.includes(index));
            const issueTypes = new Set();
            selectedIssues.forEach(issue => {
                if (issue.message.includes('//')) issueTypes.add('double-slash');
                if (issue.message.includes('notNull') || issue.message.includes('@NotNull')) issueTypes.add('notnull');
                if (issue.message.includes('@Email') || issue.message.includes('邮箱')) issueTypes.add('email');
                if (issue.message.includes('正则') || issue.message.includes('pattern') || issue.message.includes('电话')) issueTypes.add('pattern');
                if (issue.message.includes('长度')) issueTypes.add('length');
                if (issue.message.includes('范围') || issue.message.includes('min') || issue.message.includes('max')) issueTypes.add('range');
                if (issue.message.includes('@Past') || issue.message.includes('生日')) issueTypes.add('past');
                if (issue.message.includes('@Future') || issue.message.includes('计划') || issue.message.includes('预约')) issueTypes.add('future');
            });

            // 只修复选中的问题类型
            if (isSwagger) {
                // 只修复 // 路径问题（如果选中）
                if (issueTypes.has('double-slash')) {
                    this.fixSwaggerPaths(parsed);
                }
                // 修复参数问题
                this.fixStats.paramsFixed = this.fixSwaggerParamsSelective(parsed, selectedIndices);
            }

            // 根据选中的问题索引，构建需要修复的字段集合
            // key 格式: apiIndex-fieldName (如 "0-username")
            const fieldsToFix = new Map();

            this.issues.forEach((issue, index) => {
                if (!selectedIndices.includes(index)) return;

                // 跳过 info 级别的问题，它们不需要修复
                if (issue.severity === 'info') return;

                // 注意: issue.api 是 API 索引 (0-based)
                if (issue.api === undefined || issue.api === null) return;

                // 从 field 中提取字段名
                // field 格式可能是: "request.fields[0].name", "response.fields[1].name", "path", "name" 等
                let fieldName = issue.field;
                if (fieldName) {
                    // 提取字段名
                    if (fieldName.includes('fields[')) {
                        // 格式: "request.fields[0].name" 或 "response.fields[1].name"
                        if (fieldName.includes('fields[0]')) {
                            fieldName = 'field_0';
                        } else if (fieldName.includes('fields[1]')) {
                            fieldName = 'field_1';
                        } else if (fieldName.includes('fields[2]')) {
                            fieldName = 'field_2';
                        }
                    } else {
                        const parts = fieldName.split('.');
                        fieldName = parts[parts.length - 1];
                    }
                }
                if (!fieldName) return;

                const key = issue.api + '-' + fieldName;

                if (!fieldsToFix.has(key)) {
                    fieldsToFix.set(key, {});
                }

                // 根据问题类型添加验证规则
                const msg = issue.message;
                const rules = fieldsToFix.get(key);

                if (msg.includes('notNull') || msg.includes('@NotNull')) {
                    rules.notNull = true;
                }
                if (msg.includes('@Email') || msg.includes('邮箱')) {
                    rules.email = true;
                }
                if (msg.includes('正则') || msg.includes('pattern') || msg.includes('电话')) {
                    rules.pattern = '^(\\+86|86)?1[3-9]\\d{9}$';
                }
                if (msg.includes('长度')) {
                    if (!rules.minLength) rules.minLength = 1;
                    if (!rules.maxLength) rules.maxLength = 255;
                }
                if (msg.includes('范围') || msg.includes('min') || msg.includes('max')) {
                    if (msg.includes('Integer') || msg.includes('Long')) {
                        if (!rules.hasOwnProperty('min')) rules.min = 0;
                        if (!rules.hasOwnProperty('max')) rules.max = 2147483647;
                    }
                }
            });

            // 应用修复 - 使用字段索引而非名称进行匹配
            if (parsed.apis) {
                // Custom format
                parsed.apis.forEach((api, idx) => {
                    const sections = ['request', 'response'];
                    for (const section of sections) {
                        if (api[section] && api[section].fields) {
                            api[section].fields.forEach((field, fieldIdx) => {
                                // 尝试多种 key 格式进行匹配
                                const keysToTry = [
                                    idx + '-field_' + fieldIdx,  // 如 "0-field_0"
                                    idx + '-' + field.name,       // 如 "0-username"
                                    idx + '-' + fieldIdx          // 如 "0-0"
                                ];

                                for (const key of keysToTry) {
                                    if (fieldsToFix.has(key)) {
                                        if (!field.validation) field.validation = {};
                                        const rules = fieldsToFix.get(key);
                                        for (const k in rules) {
                                            field.validation[k] = rules[k];
                                        }
                                        break; // 只应用一次
                                    }
                                }
                            });
                        }
                    }
                });
            } else if (parsed.definitions || parsed.components) {
                // Swagger format - update definitions
                const defs = parsed.definitions || (parsed.components && parsed.components.schemas) || {};
                if (defs) {
                    for (const defName in defs) {
                        const def = defs[defName];
                        if (def.properties) {
                            for (const propName in def.properties) {
                                // Swagger 使用不同的 key 格式，尝试匹配
                                const key = defName + '-' + propName;
                                if (fieldsToFix.has(key)) {
                                    const rules = fieldsToFix.get(key);
                                    for (const k in rules) {
                                        if (k === 'notNull') {
                                            if (!def.required) def.required = [];
                                            if (!def.required.includes(propName)) {
                                                def.required.push(propName);
                                            }
                                        } else {
                                            def.properties[propName][k] = rules[k];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return jsyaml.dump(parsed, { indent: 2 });

        } catch (e) {
            console.error('Fix selective error:', e);
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
     * 修复 Swagger/OpenAPI 格式的路径问题（不序列化）
     */
    fixSwaggerPaths(parsed) {
        // 修复 paths 中的路径格式
        const paths = parsed.paths || {};

        for (const [path, methods] of Object.entries(paths)) {
            let fixedPath = path;
            let hasChanges = false;

            // 修复路径包含 // 的问题（只修复格式问题）
            if (fixedPath.includes('//')) {
                fixedPath = fixedPath.replace(/\/+/g, '/');
                hasChanges = true;
            }

            // 不再自动修复 /XXX/ 前缀（见 fixSwagger 中的注释）

            if (hasChanges && fixedPath !== path) {
                paths[fixedPath] = methods;
                delete paths[path];
            }
        }
    }

    /**
     * 只修复 Swagger 路径中的 // 问题（用于选择性修复）
     */
    fixSwaggerPaths(parsed) {
        // 修复 basePath 包含 // 的问题
        if (parsed.basePath && parsed.basePath.includes('//')) {
            const fixedBasePath = parsed.basePath.replace(/\/+/g, '/');
            if (fixedBasePath !== parsed.basePath) {
                this.addInfoMessage(`修复 basePath 重复斜杠: "${parsed.basePath}" → "${fixedBasePath}"`);
                parsed.basePath = fixedBasePath;
            }
        }

        // 修复 servers (OpenAPI 3.0) 包含 // 的问题
        if (parsed.servers && Array.isArray(parsed.servers)) {
            parsed.servers.forEach((server, idx) => {
                if (server.url && server.url.includes('//')) {
                    const fixedUrl = server.url.replace(/\/+/g, '/');
                    if (fixedUrl !== server.url) {
                        this.addInfoMessage(`修复 servers[${idx}] URL 重复斜杠: "${server.url}" → "${fixedUrl}"`);
                        server.url = fixedUrl;
                    }
                }
            });
        }

        // 修复 paths 中的 // 问题
        const paths = parsed.paths || {};
        for (const [path, methods] of Object.entries(paths)) {
            let currentPath = path;
            let hasChanges = false;

            if (currentPath.includes('//')) {
                currentPath = currentPath.replace(/\/+/g, '/');
                hasChanges = true;
            }

            if (hasChanges && currentPath !== path) {
                paths[currentPath] = methods;
                delete paths[path];
                this.addInfoMessage(`修复路径: "${path}" → "${currentPath}"`);
            }
        }
    }

    /**
     * 选择性修复 Swagger 参数（只修复选中的问题）
     * @returns {number} 修复的参数数量
     */
    fixSwaggerParamsSelective(parsed, selectedIndices) {
        // 收集选中问题的索引和对应的消息
        const selectedIssueMessages = new Map();
        this.issues.forEach((issue, index) => {
            if (selectedIndices.includes(index)) {
                if (!selectedIssueMessages.has(issue.field)) {
                    selectedIssueMessages.set(issue.field, []);
                }
                selectedIssueMessages.get(issue.field).push(issue.message);
            }
        });

        // 修复 paths 中的参数
        const paths = parsed.paths || {};
        const basePath = parsed.basePath || '';
        let fixedCount = 0;

        for (const [path, methods] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(methods)) {
                if (typeof operation !== 'object') continue;

                const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
                if (!httpMethods.includes(method.toLowerCase())) continue;

                // 使用 fullPath（包含 basePath），与分析时一致
                const apiPath = basePath + path;

                // 修复 parameters
                if (operation.parameters && Array.isArray(operation.parameters)) {
                    operation.parameters.forEach((param, paramIndex) => {
                        const key = `${method.toUpperCase()} ${apiPath} parameters[${paramIndex}]`;
                        let messages = selectedIssueMessages.get(key) || [];

                        // 如果没有找到，尝试匹配可能被修复的路径（// -> /）
                        if (messages.length === 0 && apiPath.includes('/')) {
                            // 尝试查找原始路径（包含 //）的问题
                            for (const [issueKey, issueMessages] of selectedIssueMessages.entries()) {
                                // 跳过无效的 key（如 undefined 或非字符串）
                                if (!issueKey || typeof issueKey !== 'string') continue;
                                if (issueKey.includes('//')) {
                                    // 将 issueKey 中的 // 替换为 / 来比较
                                    const normalizedIssueKey = issueKey.replace(/\/+/g, '/');
                                    if (normalizedIssueKey === key) {
                                        messages = issueMessages;
                                        break;
                                    }
                                }
                            }
                        }

                        if (messages.length > 0) {
                            fixedCount++;
                            messages.forEach(message => {
                                this.fixParameterValidation(param, message);
                            });
                        }
                    });
                }

                // 修复 requestBody 中的字段
                if (operation.requestBody && operation.requestBody.content &&
                    operation.requestBody.content['application/json'] &&
                    operation.requestBody.content['application/json'].schema) {
                    const schema = operation.requestBody.content['application/json'].schema;
                    const schemaFixCount = this.fixSchemaFields(schema, apiPath, method.toUpperCase(), selectedIssueMessages);
                    fixedCount += schemaFixCount;
                }
            }
        }

        return fixedCount;
    }

    /**
     * 修复 schema 中的字段（用于 requestBody）
     * @returns {number} 修复的字段数量
     */
    fixSchemaFields(schema, path, method, selectedIssueMessages) {
        let fixedCount = 0;

        // 处理 $ref 引用 - 不修复引用的字段
        if (schema.$ref) {
            return 0;
        }

        // 处理直接定义的属性
        const properties = schema.properties;
        if (!properties) return 0;

        for (const [propName, propDef] of Object.entries(properties)) {
            const fieldPath = `${path}.${method}.requestBody.${propName}`;
            const messages = selectedIssueMessages.get(fieldPath) || [];

            if (messages.length > 0) {
                fixedCount++;
                messages.forEach(message => {
                    this.fixSchemaFieldValidation(propDef, propName, message);
                });
            }

            // 递归修复嵌套对象
            if (propDef.type === 'object' && propDef.properties) {
                fixedCount += this.fixSchemaFields(propDef, path, method, selectedIssueMessages);
            }

            // 修复数组成员
            if (propDef.type === 'array' && propDef.items) {
                if (propDef.items.type === 'object' && propDef.items.properties) {
                    fixedCount += this.fixSchemaFields(propDef.items, path, method, selectedIssueMessages);
                }
            }
        }

        return fixedCount;
    }

    /**
     * 修复单个 schema 字段的校验规则（用于 requestBody 字段）
     */
    fixSchemaFieldValidation(propDef, propName, message) {
        // 日期类型字段的 @Past/@Future 建议
        if (message.includes('@Past')) {
            propDef['x-java-validation'] = propDef['x-java-validation'] || {};
            propDef['x-java-validation'].past = true;
            this.addInfoMessage(`修复字段 ${propName}: 添加 @Past 校验`);
        }

        if (message.includes('@Future')) {
            propDef['x-java-validation'] = propDef['x-java-validation'] || {};
            propDef['x-java-validation'].future = true;
            this.addInfoMessage(`修复字段 ${propName}: 添加 @Future 校验`);
        }

        // 邮箱格式
        if (message.includes('@Email') || message.includes('邮箱')) {
            propDef.format = 'email';
            this.addInfoMessage(`修复字段 ${propName}: 添加 email 格式校验`);
        }

        // 电话正则校验
        if (message.includes('电话') || message.includes('phone') || message.includes('正则校验')) {
            propDef.pattern = '^(\\+86|86)?1[3-9]\\d{9}$';
            this.addInfoMessage(`修复字段 ${propName}: 添加手机号正则校验`);
        }

        // 长度校验
        if (message.includes('长度')) {
            if (!propDef.minLength) propDef.minLength = 1;
            if (!propDef.maxLength) propDef.maxLength = 255;
            this.addInfoMessage(`修复字段 ${propName}: 添加长度校验`);
        }

        // minLength > maxLength 错误 - 交换值
        if (message.includes('minLength') && message.includes('maxLength') && message.includes('不能大于')) {
            const minLen = propDef.minLength;
            const maxLen = propDef.maxLength;
            if (minLen !== undefined && maxLen !== undefined && minLen > maxLen) {
                // 交换值
                propDef.minLength = maxLen;
                propDef.maxLength = minLen;
                this.addInfoMessage(`修复字段 ${propName}: 交换 minLength(${maxLen}) 和 maxLength(${minLen})`);
            }
        }

        // minimum > maximum 错误 - 交换值
        if (message.includes('minimum') && message.includes('maximum') && message.includes('不能大于')) {
            const min = propDef.minimum;
            const max = propDef.maximum;
            if (min !== undefined && max !== undefined && min > max) {
                // 交换值
                propDef.minimum = max;
                propDef.maximum = min;
                this.addInfoMessage(`修复字段 ${propName}: 交换 minimum(${max}) 和 maximum(${min})`);
            }
        }
    }

    /**
     * 修复单个参数的校验规则
     */
    fixParameterValidation(param, message) {
        // Swagger 2.0 参数可以直接有 type，不一定要 schema
        // 统一使用 param 本身的字段，而不是 schema 子对象
        if (!param.schema && param.type) {
            // Swagger 2.0 格式，直接在 param 上设置校验
            // 不需要创建 schema 对象
        } else if (!param.schema) {
            // 既没有 type 也没有 schema，创建默认 schema
            param.schema = { type: 'string' };
        }

        if (message.includes('notNull') || message.includes('@NotNull')) {
            // 必填参数标记并添加实际校验
            param.required = true;
            // 添加满足 hasRequiredValidation 检查的校验规则
            const paramType = param.type || (param.schema && param.schema.type);
            if (paramType === 'string' || !paramType) {
                // String 类型添加 minLength
                if (param.schema) {
                    if (!param.schema.minLength) param.schema.minLength = 1;
                } else {
                    if (!param.minLength) param.minLength = 1;
                }
            } else if (paramType === 'integer' || paramType === 'number') {
                // 数值类型添加 minimum
                if (param.schema) {
                    if (param.schema.minimum === undefined) param.schema.minimum = 1;
                } else {
                    if (param.minimum === undefined) param.minimum = 1;
                }
            }
            this.addInfoMessage(`修复参数 ${param.name}: 添加 @NotNull 校验`);
        }

        if (message.includes('长度')) {
            if (param.schema) {
                if (!param.schema.minLength) param.schema.minLength = 1;
                if (!param.schema.maxLength) param.schema.maxLength = 255;
            } else {
                if (!param.minLength) param.minLength = 1;
                if (!param.maxLength) param.maxLength = 255;
            }
            this.addInfoMessage(`修复参数 ${param.name}: 添加长度校验`);
        }

        if (message.includes('@Email') || message.includes('邮箱')) {
            if (param.schema) {
                param.schema.format = 'email';
            } else {
                param.format = 'email';
            }
            this.addInfoMessage(`修复参数 ${param.name}: 添加 email 格式校验`);
        }

        if (message.includes('电话') || message.includes('phone')) {
            if (param.schema) {
                param.schema.pattern = '^(\\+86|86)?1[3-9]\\d{9}$';
            } else {
                param.pattern = '^(\\+86|86)?1[3-9]\\d{9}$';
            }
            this.addInfoMessage(`修复参数 ${param.name}: 添加手机号正则校验`);
        }

        // 数值类型范围校验
        const numType = param.type || (param.schema && param.schema.type);
        if (numType === 'integer' || numType === 'number') {
            if (message.includes('范围') || message.includes('最小值') ||
                (message.includes('min') && message.includes('max'))) {
                const target = param.schema || param;
                if (param.name.toLowerCase().includes('page')) {
                    target.minimum = 1;
                    target.maximum = 2147483647;
                } else if (param.name.toLowerCase().includes('size') ||
                           param.name.toLowerCase().includes('limit')) {
                    target.minimum = 1;
                    target.maximum = 100;
                } else if (param.in === 'path') {
                    // 路径参数
                    target.minimum = 1;
                } else {
                    target.minimum = 0;
                    target.maximum = 2147483647;
                }
                this.addInfoMessage(`修复参数 ${param.name}: 添加范围校验`);
            }
        }

        // 数组类型大小校验
        const arrType = param.type || (param.schema && param.schema.type);
        if (arrType === 'array') {
            if (message.includes('大小') || message.includes('minItems') || message.includes('maxItems')) {
                const target = param.schema || param;
                if (!target.minItems) target.minItems = 1;
                if (!target.maxItems) target.maxItems = 100;
                this.addInfoMessage(`修复参数 ${param.name}: 添加数组大小校验`);
            }
        }

        // minLength > maxLength 错误 - 交换值
        if (message.includes('minLength') && message.includes('maxLength') && message.includes('不能大于')) {
            const target = param.schema || param;
            const minLen = target.minLength;
            const maxLen = target.maxLength;
            if (minLen !== undefined && maxLen !== undefined && minLen > maxLen) {
                target.minLength = maxLen;
                target.maxLength = minLen;
                this.addInfoMessage(`修复参数 ${param.name}: 交换 minLength(${maxLen}) 和 maxLength(${minLen})`);
            }
        }

        // minimum > maximum 错误 - 交换值
        if (message.includes('minimum') && message.includes('maximum') && message.includes('不能大于')) {
            const target = param.schema || param;
            const min = target.minimum;
            const max = target.maximum;
            if (min !== undefined && max !== undefined && min > max) {
                target.minimum = max;
                target.maximum = min;
                this.addInfoMessage(`修复参数 ${param.name}: 交换 minimum(${max}) 和 maximum(${min})`);
            }
        }
    }

    /**
     * 修复 Swagger/OpenAPI 格式
     */
    fixSwagger(parsed) {
        // 修复 basePath 包含 // 的问题
        if (parsed.basePath && parsed.basePath.includes('//')) {
            const fixedBasePath = parsed.basePath.replace(/\/+/g, '/');
            if (fixedBasePath !== parsed.basePath) {
                this.addInfoMessage(`修复 basePath 重复斜杠: "${parsed.basePath}" → "${fixedBasePath}"`);
                parsed.basePath = fixedBasePath;
            }
        }

        // 修复 servers (OpenAPI 3.0) 包含 // 的问题
        if (parsed.servers && Array.isArray(parsed.servers)) {
            parsed.servers.forEach((server, idx) => {
                if (server.url && server.url.includes('//')) {
                    const fixedUrl = server.url.replace(/\/+/g, '/');
                    if (fixedUrl !== server.url) {
                        this.addInfoMessage(`修复 servers[${idx}] URL 重复斜杠: "${server.url}" → "${fixedUrl}"`);
                        server.url = fixedUrl;
                    }
                }
            });
        }

        // 修复 paths 中的路径格式
        const paths = parsed.paths || {};

        // 首先检测重复的 HTTP 方法（同一路径下多个相同方法）
        for (const [path, methods] of Object.entries(paths)) {
            if (typeof methods !== 'object') continue;

            // 检查是否有重复的 HTTP 方法
            const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
            for (const method of httpMethods) {
                // 如果同一个方法出现多次，js-yaml 会把它变成数组
                if (Array.isArray(methods[method])) {
                    this.addIssue('error', `路径 "${path}" 下有重复的 ${method.toUpperCase()} 方法，请检查 YAML 语法`, 0);
                    return null;  // 返回 null 表示无法修复
                }
            }
        }

        for (const [path, methods] of Object.entries(paths)) {
            let currentPath = path;
            let hasChanges = false;

            // 修复路径包含 // 的问题（删除多余的 /）
            // 注意：只修复重复斜杠，不修复 /XXX/ 占位符（因为那是业务逻辑）
            if (currentPath.includes('//')) {
                currentPath = currentPath.replace(/\/+/g, '/');
                hasChanges = true;
            }

            // 不再自动修复 /XXX/ 前缀，因为：
            // 1. /XXX/ 可能是业务逻辑的一部分（如 /v1/users、/api/users）
            // 2. 自动删除可能破坏业务语义
            // 3. 应该由开发者手动确认并修改

            if (hasChanges && currentPath !== path) {
                paths[currentPath] = methods;
                delete paths[path];
                this.addInfoMessage(`修复路径: "${path}" → "${currentPath}"`);
            }

            // 修复每个 operation
            for (const [method, operation] of Object.entries(methods)) {
                if (typeof operation === 'object') {
                    this.fixSwaggerOperation(operation);
                }
            }
        }

        // 修复 definitions/components 中的字段验证规则
        this.fixSwaggerDefinitions(parsed);

        return jsyaml.dump(parsed, { indent: 2 });
    }

    /**
     * 修复 Swagger definitions/components 字段验证规则
     */
    fixSwaggerDefinitions(parsed) {
        const definitions = parsed.definitions || (parsed.components && parsed.components.schemas) || {};
        if (!definitions || Object.keys(definitions).length === 0) return;

        for (const [defName, schema] of Object.entries(definitions)) {
            if (!schema.properties) continue;

            for (const [propName, prop] of Object.entries(schema.properties)) {
                const fieldName = propName.toLowerCase();
                let hasValidation = false;

                // 1. 必填字段添加 required: true
                if (schema.required && schema.required.includes(propName)) {
                    if (!prop.required) {
                        prop.required = true;
                        this.addInfoMessage(`修复 ${defName}.${propName}: 添加 required=true`);
                        hasValidation = true;
                    }
                }

                // 2. String 类型添加长度校验
                if (prop.type === 'string' && !prop.minLength && !prop.maxLength && !prop.pattern) {
                    // 特殊字段名添加特定校验
                    if (fieldName.includes('email') || fieldName.includes('mail')) {
                        prop.pattern = '^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$';
                        this.addInfoMessage(`修复 ${defName}.${propName}: 添加 email 格式校验 (pattern)`);
                        hasValidation = true;
                    } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
                        prop.pattern = '^1[3-9]\d{9}$';
                        this.addInfoMessage(`修复 ${defName}.${propName}: 添加手机号格式校验 (pattern)`);
                        hasValidation = true;
                    } else if (fieldName.includes('url') || fieldName.includes('link')) {
                        prop.pattern = '^https?://[\w\-]+(\.[\w\-]+)+[/#?]?.*$';
                        this.addInfoMessage(`修复 ${defName}.${propName}: 添加 URL 格式校验 (pattern)`);
                        hasValidation = true;
                    } else {
                        // 普通String字段添加默认长度校验
                        prop.minLength = 1;
                        prop.maxLength = 255;
                        this.addInfoMessage(`修复 ${defName}.${propName}: 添加 String 长度校验 (minLength=1, maxLength=255)`);
                        hasValidation = true;
                    }
                }

                // 3. Integer/Number 类型添加范围校验
                if ((prop.type === 'integer' || prop.type === 'number') && !prop.minimum && !prop.maximum) {
                    // 根据字段名推断范围
                    if (fieldName.includes('age')) {
                        prop.minimum = 0;
                        prop.maximum = 150;
                        this.addInfoMessage(`修复 ${defName}.${propName}: 添加年龄范围校验 (min=0, max=150)`);
                        hasValidation = true;
                    } else if (fieldName.includes('score') || fieldName.includes('rate')) {
                        prop.minimum = 0;
                        prop.maximum = 100;
                        this.addInfoMessage(`修复 ${defName}.${propName}: 添加评分范围校验 (min=0, max=100)`);
                        hasValidation = true;
                    } else if (fieldName.includes('price') || fieldName.includes('amount') || fieldName.includes('total')) {
                        prop.minimum = 0;
                        // 不设置最大值
                        this.addInfoMessage(`修复 ${defName}.${propName}: 添加金额范围校验 (min=0)`);
                        hasValidation = true;
                    } else if (!fieldName.includes('id') && !fieldName.includes('count') && !fieldName.includes('page') && !fieldName.includes('size')) {
                        // 普通数值字段添加默认范围 (与Maven ValidationFixer一致)
                        prop.minimum = 0;
                        prop.maximum = 2147483647;
                        this.addInfoMessage(`修复 ${defName}.${propName}: 添加数值范围校验 (min=0, max=2147483647)`);
                        hasValidation = true;
                    }
                }

                // 4. Array 类型添加大小校验 (与Maven ValidationFixer一致)
                if (prop.type === 'array' && !prop.minItems && !prop.maxItems) {
                    prop.minItems = 1;
                    prop.maxItems = 100;
                    this.addInfoMessage(`修复 ${defName}.${propName}: 添加数组大小校验 (minItems=1, maxItems=100)`);
                    hasValidation = true;
                }
            }
        }
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

        // 确保有 parameters 的 description、type、required 和 validation
        if (operation.parameters) {
            operation.parameters.forEach(param => {
                // 添加 description
                if (!param.description && param.name) {
                    param.description = this.toDescription(param.name);
                }

                // 处理 required 参数：添加 @NotNull 注解（通过设置 minimum 来标记）
                // 检查是否已有校验规则，避免重复添加
                const hasRequiredValidation = param.required === true &&
                    !param.minNotNull &&
                    !param.minimum &&
                    !param.minLength &&
                    !(param.schema && (param.schema.minimum || param.schema.minLength || param.schema.required === true));

                if (hasRequiredValidation) {
                    param.minNotNull = true;
                    this.addInfoMessage(`修复参数 ${param.name}: 必填参数添加 @NotNull 校验`);

                    // 必填参数还需要添加实际校验（根据类型）
                    var requiredType = param.type || (param.schema && param.schema.type);
                    if (requiredType === 'string') {
                        // String 类型添加 minLength
                        if (!param.minLength) {
                            param.minLength = 1;
                            if (param.schema) param.schema.minLength = 1;
                        }
                    } else if (requiredType === 'integer' || requiredType === 'number') {
                        // 数值类型添加 minimum
                        if (!param.minimum) {
                            param.minimum = 1;
                            if (param.schema) param.schema.minimum = 1;
                        }
                    }
                }

                // 添加 type（如果没有 schema，默认使用 string）
                // 注意：Swagger参数类型可能在 param.type 或 param.schema.type
                // 不根据参数名推断类型，保留用户的原始定义
                var paramType = param.type || (param.schema && param.schema.type);
                if (!paramType && !param.schema) {
                    // Swagger规范默认类型是string，自动添加以消除警告
                    param.type = 'string';
                    this.addInfoMessage(`修复参数 ${param.name}: 添加默认类型 (type=string)`);
                }

                // 路径参数添加默认校验规则
                if (param.in === 'path') {
                    var pathParamType = param.type || (param.schema && param.schema.type);
                    if (pathParamType === 'integer' || pathParamType === 'number') {
                        // 路径参数是数值类型，添加范围校验（仅当不存在时）
                        const hasMinValidation = param.minimum || (param.schema && param.schema.minimum);
                        if (!hasMinValidation) {
                            param.minimum = 1;
                            if (param.schema) param.schema.minimum = 1;
                            this.addInfoMessage(`修复路径参数 ${param.name}: 添加最小值校验 (minimum=1)`);
                        }
                    } else if (pathParamType === 'string') {
                        // 路径参数是字符串类型，添加长度校验（默认非空，仅当不存在时）
                        const hasMinLengthValidation = param.minLength || (param.schema && param.schema.minLength);
                        if (!hasMinLengthValidation) {
                            param.minLength = 1;
                            if (param.schema) param.schema.minLength = 1;
                            this.addInfoMessage(`修复路径参数 ${param.name}: 添加最小长度校验 (minLength=1)`);
                        }
                    }
                }

                // 添加 validation 校验规则（根据字段名推断）
                const fieldName = (param.name || '').toLowerCase();
                var paramType = param.type || (param.schema && param.schema.type);

                // String类型添加长度校验（仅当不存在任何校验时）
                const hasStringValidation = param.minLength || param.maxLength || param.pattern ||
                    (param.schema && (param.schema.minLength || param.schema.maxLength || param.schema.pattern));

                if (paramType === 'string' && !hasStringValidation) {
                    if (fieldName.includes('email') || fieldName.includes('mail')) {
                        param.pattern = '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$';
                        if (param.schema) param.schema.pattern = param.pattern;
                        this.addInfoMessage(`修复参数 ${param.name}: 添加 email 格式校验 (pattern)`);
                    } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
                        param.pattern = '^(\\+86|86)?1[3-9]\\d{9}$';
                        if (param.schema) param.schema.pattern = param.pattern;
                        this.addInfoMessage(`修复参数 ${param.name}: 添加手机号格式校验 (pattern)`);
                    } else if (fieldName.includes('url') || fieldName.includes('link')) {
                        param.pattern = '^https?://[\\w\\-]+(\\.[\\w\\-]+)+[/#?]?.*$';
                        if (param.schema) param.schema.pattern = param.pattern;
                        this.addInfoMessage(`修复参数 ${param.name}: 添加 URL 格式校验 (pattern)`);
                    } else {
                        // 普通String参数添加默认长度校验
                        param.minLength = 1;
                        param.maxLength = 255;
                        if (param.schema) {
                            param.schema.minLength = 1;
                            param.schema.maxLength = 255;
                        }
                        this.addInfoMessage(`修复参数 ${param.name}: 添加 String 长度校验 (minLength=1, maxLength=255)`);
                    }
                }

                // Integer/Number类型添加范围校验（仅当不存在任何校验时）
                const hasNumericValidation = param.minimum || param.maximum ||
                    (param.schema && (param.schema.minimum || param.schema.maximum));

                if ((paramType === 'integer' || paramType === 'number') && !hasNumericValidation) {
                    if (fieldName === 'page' || fieldName === 'pageNum') {
                        // 页码从1开始，添加默认最大值
                        param.minimum = 1;
                        param.maximum = 2147483647;
                        if (param.schema) {
                            param.schema.minimum = 1;
                            param.schema.maximum = 2147483647;
                        }
                        this.addInfoMessage(`修复参数 ${param.name}: 添加页码范围校验 (min=1, max=2147483647)`);
                    } else if (fieldName.includes('size') || fieldName.includes('limit') || fieldName === 'pageSize') {
                        // 每页数量
                        param.minimum = 1;
                        param.maximum = 100;
                        if (param.schema) {
                            param.schema.minimum = 1;
                            param.schema.maximum = 100;
                        }
                        this.addInfoMessage(`修复参数 ${param.name}: 添加每页数量范围校验 (min=1, max=100)`);
                    } else if (fieldName.includes('age')) {
                        param.minimum = 0;
                        param.maximum = 150;
                        if (param.schema) {
                            param.schema.minimum = 0;
                            param.schema.maximum = 150;
                        }
                        this.addInfoMessage(`修复参数 ${param.name}: 添加年龄范围校验 (min=0, max=150)`);
                    } else if (fieldName.includes('score') || fieldName.includes('rate')) {
                        param.minimum = 0;
                        param.maximum = 100;
                        if (param.schema) {
                            param.schema.minimum = 0;
                            param.schema.maximum = 100;
                        }
                        this.addInfoMessage(`修复参数 ${param.name}: 添加评分范围校验 (min=0, max=100)`);
                    } else if (fieldName.includes('price') || fieldName.includes('amount') || fieldName.includes('total')) {
                        param.minimum = 0;
                        if (param.schema) {
                            param.schema.minimum = 0;
                        }
                        this.addInfoMessage(`修复参数 ${param.name}: 添加金额范围校验 (min=0)`);
                    } else if (!fieldName.includes('id')) {
                        // 普通数值参数添加默认范围（排除id），与Maven ValidationFixer一致
                        param.minimum = 0;
                        param.maximum = 2147483647;
                        if (param.schema) {
                            param.schema.minimum = 0;
                            param.schema.maximum = 2147483647;
                        }
                        this.addInfoMessage(`修复参数 ${param.name}: 添加数值范围校验 (min=0, max=2147483647)`);
                    }
                }

                // Array/List 类型添加大小校验（仅当不存在任何校验时）
                const hasArrayValidation = param.minItems || param.maxItems ||
                    (param.schema && (param.schema.minItems || param.schema.maxItems));

                if ((paramType === 'array' || (param.schema && param.schema.type === 'array')) && !hasArrayValidation) {
                    param.minItems = 1;
                    param.maxItems = 100;
                    if (param.schema) {
                        param.schema.minItems = 1;
                        param.schema.maxItems = 100;
                    }
                    this.addInfoMessage(`修复参数 ${param.name}: 添加数组大小校验 (minItems=1, maxItems=100)`);
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
            field.validation.pattern = '^(\\+86|86)?1[3-9]\\d{9}$';
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
     * @param {string} severity - 严重程度: error, warn, info
     * @param {string} message - 问题消息
     * @param {number} line - 行号
     * @param {number} apiIndex - API索引
     * @param {string} field - 字段路径
     * @param {string} rule - 规则依据/来源
     */
    addIssue(severity, message, line, apiIndex, field, rule) {
        this.issues.push({
            severity: severity,
            message: message,
            line: line,
            api: apiIndex,
            field: field,
            rule: rule || this.getDefaultRule(severity, message)
        });
    }

    /**
     * 获取默认规则依据
     */
    getDefaultRule(severity, message) {
        // 根据消息内容推断规则
        if (message.includes('路径不能包含 //')) return 'DFX-001: 路径规范 - 不能包含重复斜杠';
        if (message.includes('路径必须以 / 开头')) return 'DFX-002: 路径规范 - 必须以 / 开头';
        if (message.includes('必填字段缺少 @NotNull')) return 'DFX-003: 必填校验 - required=true 必须添加 notNull';
        if (message.includes('String 字段缺少')) return 'DFX-004: 字符串校验 - String 类型需添加长度或格式校验';
        if (message.includes('@Email')) return 'DFX-005: 邮箱校验 - email 类型字段需添加 @Email';
        if (message.includes('正则校验')) return 'DFX-006: 电话校验 - 电话字段需添加正则 ^1[3-9]\\d{9}$';
        if (message.includes('数值字段缺少范围')) return 'DFX-007: 数值校验 - 数值类型需添加 min/max 范围';
        if (message.includes('List 字段缺少大小')) return 'DFX-008: 集合校验 - List 类型需添加 minSize/maxSize';
        if (message.includes('minLength 不能大于 maxLength')) return 'DFX-009: 校验规则 - minLength 不能超过 maxLength';
        if (message.includes('min 不能大于 max')) return 'DFX-010: 校验规则 - min 不能超过 max';
        if (message.includes('minSize 不能大于 maxSize')) return 'DFX-011: 校验规则 - minSize 不能超过 maxSize';
        if (message.includes('缺少 operationId')) return 'DFX-012: 接口规范 - operationId 用于唯一标识接口';
        if (message.includes('缺少成功响应')) return 'DFX-013: 接口规范 - 需定义 2xx 成功响应';
        if (message.includes('路径参数') && message.includes('缺少最小值校验')) return 'DFX-014: 路径校验 - 路径参数需添加最小值校验';
        if (message.includes('缺少 API 名称')) return 'DFX-015: 接口规范 - 必须指定 API 名称';
        if (message.includes('缺少 API 路径')) return 'DFX-016: 接口规范 - 必须指定 API 路径';
        if (message.includes('缺少 HTTP 方法')) return 'DFX-017: 接口规范 - 必须指定 HTTP 方法';
        if (message.includes('重复的')) return 'DFX-018: YAML 语法 - 检测到重复的键';
        if (message.includes('解析错误')) return 'DFX-019: YAML 语法 - YAML 格式解析失败';
        if (severity === 'error') return '规则验证失败';
        return '建议优化';
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
