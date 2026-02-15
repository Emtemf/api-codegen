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
     * 选择性修复问题 - 只修复选中的问题
     */
    fixSelective(yamlContent, selectedIndices) {
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

            // 如果是Swagger格式，修复路径和参数问题
            if (isSwagger) {
                this.fixSwagger(parsed);
            }

            // 根据选中的问题索引，构建需要修复的字段集合
            // key 格式: apiIndex-fieldName (如 "0-username")
            const fieldsToFix = new Map();

            this.issues.forEach((issue, index) => {
                if (!selectedIndices.includes(index)) return;
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
            // 修复路径包含 // 的问题
            if (path.includes('//')) {
                const fixedPath = path.replace(/\/+/g, '/');
                paths[fixedPath] = methods;
                if (fixedPath !== path) {
                    delete paths[path];
                }
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
                    return yamlContent;  // 不修复，直接返回原内容
                }
            }
        }

        for (const [path, methods] of Object.entries(paths)) {
            // 修复路径包含 // 的问题（删除多余的 /）
            if (path.includes('//')) {
                const fixedPath = path.replace(/\/+/g, '/');
                paths[fixedPath] = methods;
                if (fixedPath !== path) {
                    delete paths[path];
                    this.addInfoMessage(`修复路径重复斜杠: "${path}" → "${fixedPath}" (删除了多余的 /)`);
                }
            }

            // 修复每个 operation
            for (const [method, operation] of Object.entries(methods)) {
                this.fixSwaggerOperation(operation);
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
                // Swagger参数没有专门的校验注解字段，我们用 minNotNull 来标记
                if (param.required === true) {
                    param.minNotNull = true;
                    this.addInfoMessage(`修复参数 ${param.name}: 必填参数添加 @NotNull 校验`);
                }

                // 添加 type（如果没有 schema）
                // 注意：Swagger参数类型可能在 param.type 或 param.schema.type
                var paramType = param.type || (param.schema && param.schema.type);
                if (!paramType && !param.schema) {
                    // 根据参数名推断类型
                    const name = param.name.toLowerCase();
                    if (name.includes('id') || name === 'page' || name === 'size' || name === 'count' || name === 'age' || name === 'quantity') {
                        param.type = 'integer';
                        if (param.schema) param.schema.type = 'integer';
                    } else if (name.includes('price') || name === 'amount' || name === 'total') {
                        param.type = 'number';
                        if (param.schema) param.schema.type = 'number';
                    } else if (name.includes('flag') || name === 'enabled' || name === 'active' || name === 'status') {
                        param.type = 'boolean';
                        if (param.schema) param.schema.type = 'boolean';
                    } else {
                        param.type = 'string';
                        if (param.schema) param.schema.type = 'string';
                    }
                }

                // 添加 validation 校验规则（根据字段名推断）
                const fieldName = (param.name || '').toLowerCase();
                var paramType = param.type || (param.schema && param.schema.type);

                // String类型添加长度校验
                if (paramType === 'string' && !param.minLength && !param.maxLength && !param.pattern && !(param.schema && param.schema.minLength) && !(param.schema && param.schema.maxLength) && !(param.schema && param.schema.pattern)) {
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

                // Integer/Number类型添加范围校验
                if ((paramType === 'integer' || paramType === 'number') && !param.minimum && !param.maximum && !(param.schema && param.schema.minimum) && !(param.schema && param.schema.maximum)) {
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
        if (message.includes('缺少 API 名称')) return 'DFX-014: 接口规范 - 必须指定 API 名称';
        if (message.includes('缺少 API 路径')) return 'DFX-015: 接口规范 - 必须指定 API 路径';
        if (message.includes('缺少 HTTP 方法')) return 'DFX-016: 接口规范 - 必须指定 HTTP 方法';
        if (message.includes('重复的')) return 'DFX-017: YAML 语法 - 检测到重复的键';
        if (message.includes('解析错误')) return 'DFX-018: YAML 语法 - YAML 格式解析失败';
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
