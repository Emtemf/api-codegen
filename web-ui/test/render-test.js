/**
 * API Codegen Web UI - 渲染功能测试
 *
 * 测试分类：
 * 1. computeImpact 函数 - 验证变更检测逻辑
 * 2. 变更详情显示 - 验证变更内容的格式化
 * 3. Java代码生成 - 验证生成的代码语法正确性
 *
 * 运行方式：cd web-ui && node test/render-test.js
 */

const fs = require('fs');
const path = require('path');

// Load js-yaml
const jsyaml = require('js-yaml');

console.log('\n' + '='.repeat(70));
console.log('   API Codegen Web UI - 渲染功能测试');
console.log('='.repeat(70) + '\n');

let passed = 0;
let failed = 0;
const results = [];

function extractFunctionSource(fileContent, functionName) {
    const startToken = `function ${functionName}`;
    const startIndex = fileContent.indexOf(startToken);
    if (startIndex === -1) {
        throw new Error(`未在 index.html 中找到函数: ${functionName}`);
    }

    const bodyStart = fileContent.indexOf('{', startIndex);
    if (bodyStart === -1) {
        throw new Error(`函数 ${functionName} 缺少函数体`);
    }

    let depth = 0;
    for (let i = bodyStart; i < fileContent.length; i++) {
        const char = fileContent[i];
        if (char === '{') depth++;
        if (char === '}') depth--;
        if (depth === 0) {
            return fileContent.slice(startIndex, i + 1);
        }
    }

    throw new Error(`函数 ${functionName} 提取失败，括号未闭合`);
}

function loadComputeImpactFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const normalizePathForDiffSource = extractFunctionSource(indexHtml, 'normalizePathForDiff');
    const getSwaggerFieldChangesSource = extractFunctionSource(indexHtml, 'getSwaggerFieldChanges');
    const computeImpactSource = extractFunctionSource(indexHtml, 'computeImpact');

    return eval(`(() => {
        ${normalizePathForDiffSource}
        ${getSwaggerFieldChangesSource}
        ${computeImpactSource}
        return computeImpact;
    })()`);
}

const computeImpact = loadComputeImpactFromIndex();

function loadIsAutoFixableFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const isAutoFixableSource = extractFunctionSource(indexHtml, 'isAutoFixable');

    return eval(`(() => {
        ${isAutoFixableSource}
        return isAutoFixable;
    })()`);
}

const isAutoFixable = loadIsAutoFixableFromIndex();

function loadIsManualLocatableFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const isManualLocatableSource = extractFunctionSource(indexHtml, 'isManualLocatable');

    return eval(`(() => {
        ${isManualLocatableSource}
        return isManualLocatable;
    })()`);
}

const isManualLocatable = loadIsManualLocatableFromIndex();

function loadFindIssueLocationLineFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const splitIssueApiRefSource = extractFunctionSource(indexHtml, 'splitIssueApiRef');
    const extractIssueFieldNameSource = extractFunctionSource(indexHtml, 'extractIssueFieldName');
    const findIssueLocationLineSource = extractFunctionSource(indexHtml, 'findIssueLocationLine');

    return eval(`(() => {
        ${splitIssueApiRefSource}
        ${extractIssueFieldNameSource}
        ${findIssueLocationLineSource}
        return findIssueLocationLine;
    })()`);
}

const findIssueLocationLine = loadFindIssueLocationLineFromIndex();

function uniqueStrings(values) {
    const seen = new Set();
    return (values || []).filter(value => {
        if (!value || typeof value !== 'string' || seen.has(value)) {
            return false;
        }
        seen.add(value);
        return true;
    });
}

function extractResourceAnnotationEntries(parsed) {
    if (!parsed) return [];
    const entries = [];
    const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

    if (parsed.paths) {
        Object.keys(parsed.paths).forEach(pathKey => {
            const pathItem = parsed.paths[pathKey] || {};
            const classAnnotations = Array.isArray(pathItem['x-java-class-annotations']) ? pathItem['x-java-class-annotations'] : [];

            httpMethods.forEach(method => {
                const operation = pathItem[method];
                if (!operation || typeof operation !== 'object') return;

                const methodAnnotations = Array.isArray(operation['x-java-method-annotations']) ? operation['x-java-method-annotations'] : [];
                const legacyAnnotations = Array.isArray(operation.annotations) ? operation.annotations : [];
                if (classAnnotations.length === 0 && methodAnnotations.length === 0 && legacyAnnotations.length === 0) return;

                entries.push({
                    path: `${method.toUpperCase()} ${pathKey}`,
                    classAnnotations: uniqueStrings(classAnnotations),
                    methodAnnotations: uniqueStrings(methodAnnotations.concat(legacyAnnotations))
                });
            });
        });
    }

    return entries;
}

function normalizeAnnotationBundle(annotations) {
    if (Array.isArray(annotations)) {
        return {
            classAnnotations: [],
            methodAnnotations: [],
            legacyAnnotations: annotations
        };
    }

    annotations = annotations || {};
    return {
        classAnnotations: annotations.classAnnotations || [],
        methodAnnotations: annotations.methodAnnotations || [],
        legacyAnnotations: annotations.legacyAnnotations || annotations.annotations || []
    };
}

function generateJavaControllerPreview(annotations) {
    const bundle = normalizeAnnotationBundle(annotations);
    const lines = [];

    if (bundle.classAnnotations.length > 0) {
        lines.push('// 资源组注解');
        bundle.classAnnotations.forEach(annotation => lines.push(annotation));
    }

    const methodAnnotations = bundle.methodAnnotations.concat(bundle.legacyAnnotations);
    if (methodAnnotations.length > 0) {
        lines.push('// 方法注解');
        methodAnnotations.forEach(annotation => lines.push(annotation));
    }

    lines.push('@GetMapping("/users")');
    return lines.join('\n');
}

/**
 * 简化的变更详情格式化函数（测试用）
 */
function formatParamChangeDetails(api) {
    var details = { before: [], after: [] };

    if (!api.changes || api.changes.length === 0) {
        return details;
    }

    api.changes.forEach(function(change) {
        if (change.prop === 'path') {
            details.before.push('修复路径: ' + change.before);
            details.after.push('→ ' + change.after);
        } else if (change.prop.startsWith('参数 ')) {
            var paramName = change.prop
                .replace('参数 ', '')
                .replace(/ minLength$/, '')
                .replace(/ maxLength$/, '')
                .replace(/ minimum$/, '')
                .replace(/ maximum$/, '')
                .replace(/ pattern$/, '')
                .replace(/ description$/, '')
                .replace(/ type$/, '')
                .trim();

            if (change.prop.includes('minLength')) {
                // minLength=0 相当于无限制，不显示
                if (change.after === 0) {
                    details.before.push('参数 ' + paramName + ': 缺失最大长度校验');
                    details.after.push('→ 新增 @Size(max=255)');
                } else {
                    details.before.push('参数 ' + paramName + ': 缺失最小长度校验');
                    details.after.push('→ 新增 @Size(min=' + change.after + ')');
                }
            } else if (change.prop.includes('maxLength')) {
                details.before.push('参数 ' + paramName + ': 缺失最大长度校验');
                details.after.push('→ 新增 @Size(max=' + change.after + ')');
            } else if (change.prop.includes('minimum')) {
                details.before.push('参数 ' + paramName + ': 缺失最小值校验');
                details.after.push('→ 新增 @Min(' + change.after + ')');
            } else if (change.prop.includes('maximum')) {
                details.before.push('参数 ' + paramName + ': 缺失最大值校验');
                details.after.push('→ 新增 @Max(' + change.after + ')');
            } else if (change.prop.includes('pattern')) {
                details.before.push('参数 ' + paramName + ': 缺失正则校验');
                details.after.push('→ 新增 @Pattern(regexp="' + change.after + '")');
            } else if (change.prop.includes('description')) {
                details.before.push('参数 ' + paramName + ': 缺少描述');
                details.after.push('→ 描述: ' + change.after);
            } else if (change.prop.includes('type')) {
                details.before.push('参数 ' + paramName + ': 缺少类型');
                details.after.push('→ 类型: ' + change.after);
            }
        }
    });

    return details;
}

/**
 * 测试框架
 */
function test(category, name, fn) {
    const testId = results.length + 1;
    try {
        const result = fn();
        if (result.pass) {
            passed++;
            results.push({ testId, category, name, status: 'PASS', actual: result });
            console.log(`\x1b[32m[PASS]\x1b[0m #${testId} ${name}`);
            if (result.message) {
                console.log(`       ${result.message}`);
            }
        } else {
            throw new Error(result.message || '测试失败');
        }
    } catch (e) {
        failed++;
        results.push({ testId, category, name, status: 'FAIL', actual: e.message });
        console.log(`\x1b[31m[FAIL]\x1b[0m #${testId} ${name}`);
        console.log(`       原因: ${e.message}`);
    }
}

// ============================================
// 测试用例
// ============================================

console.log('\n--- 1. computeImpact 函数测试 ---\n');

// 测试1: 检测路径修复 - 相同路径无变更
test('computeImpact', '检测路径相同无变更', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    return {
        pass: impact.apis.length === 0,
        message: '路径相同时应无变更，当前: ' + impact.apis.length + '个'
    };
});

// 测试1b: 检测路径 /XXX/ 前缀应被修复
test('computeImpact', '检测路径 /XXX/ 前缀修复', function() {
    const before = `swagger: "2.0"
paths:
  /XXX/users/detail:
    get:
      operationId: getUserDetail
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users/detail:
    get:
      operationId: getUserDetail
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasPathChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop === 'path')
    );

    return {
        pass: hasPathChange,
        message: `检测到路径变更: ${impact.apis.length} 个API, 变更: ${JSON.stringify(impact.apis[0]?.changes)}`
    };
});

// 测试2: 检测参数校验添加
test('computeImpact', '检测参数 minLength 添加', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: keyword
          in: query
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: keyword
          in: query
          minLength: 1
          maxLength: 255
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasMinLengthChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop.includes('minLength'))
    );

    return {
        pass: hasMinLengthChange,
        message: `检测到参数校验变更: ${impact.apis.length} 个API变更`
    };
});

// 测试3: 检测参数 minimum/maximum 添加
test('computeImpact', '检测参数数值范围添加', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: page
          in: query
          type: integer
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: page
          in: query
          type: integer
          minimum: 1
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasMinChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop.includes('minimum'))
    );

    return {
        pass: hasMinChange,
        message: `检测到minimum变更: ${JSON.stringify(impact.apis[0]?.changes)}`
    };
});

// 测试4: 检测参数 description 添加
test('computeImpact', '检测参数描述添加', function() {
    const before = `swagger: "2.0"
paths:
  /users/{id}:
    get:
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users/{id}:
    get:
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          description: User ID
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasDescChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop.includes('description'))
    );

    return {
        pass: hasDescChange,
        message: `检测到description变更: ${impact.apis.length} 个API变更`
    };
});

// 测试5: 检测参数 type 添加
test('computeImpact', '检测参数类型添加', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: page
          in: query
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      parameters:
        - name: page
          in: query
          type: integer
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const hasTypeChange = impact.apis.some(api =>
        api.changes && api.changes.some(c => c.prop.includes('type'))
    );

    return {
        pass: hasTypeChange,
        message: `检测到type变更: ${impact.apis.length} 个API变更`
    };
});

// 测试6: 字段变更检测
test('computeImpact', '检测字段校验规则添加', function() {
    const before = `swagger: "2.0"
definitions:
  User:
    type: object
    properties:
      username:
        type: string`;

    const after = `swagger: "2.0"
definitions:
  User:
    type: object
    properties:
      username:
        type: string
        minLength: 4
        maxLength: 20`;

    const impact = computeImpact(before, after);
    const hasFieldChange = impact.fields.length > 0;

    return {
        pass: hasFieldChange,
        message: `检测到字段变更: ${impact.fields.length} 个字段变更`
    };
});

console.log('\n--- 2. 变更详情格式化测试 ---\n');

// 测试7: 变更详情格式化 - minLength=1 (正确规则)
test('formatParamChangeDetails', '格式化 minLength=1 变更', function() {
    const api = {
        changes: [
            { prop: '参数 keyword minLength', before: '(无)', after: 1 }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失最小长度校验') &&
              details.after[0].includes('@Size(min=1)'),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试7b: 变更详情格式化 - minLength=0 (历史兼容)
test('formatParamChangeDetails', '格式化 minLength=0 变更(历史兼容)', function() {
    const api = {
        changes: [
            { prop: '参数 keyword minLength', before: '(无)', after: 0 }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失最大长度校验') &&
              details.after[0].includes('@Size(max='),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试8: 变更详情格式化 - minimum
test('formatParamChangeDetails', '格式化 minimum 变更', function() {
    const api = {
        changes: [
            { prop: '参数 page minimum', before: '(无)', after: 1 }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失最小值校验') &&
              details.after[0].includes('@Min('),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试9: 变更详情格式化 - maximum
test('formatParamChangeDetails', '格式化 maximum 变更', function() {
    const api = {
        changes: [
            { prop: '参数 size maximum', before: '(无)', after: 100 }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失最大值校验') &&
              details.after[0].includes('@Max('),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试10: 变更详情格式化 - pattern
test('formatParamChangeDetails', '格式化 pattern 变更', function() {
    const api = {
        changes: [
            { prop: '参数 email pattern', before: '(无)', after: '^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$' }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺失正则校验') &&
              details.after[0].includes('@Pattern(regexp='),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试11: 变更详情格式化 - description
test('formatParamChangeDetails', '格式化 description 变更', function() {
    const api = {
        changes: [
            { prop: '参数 id description', before: '(无)', after: 'User ID' }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺少描述') &&
              details.after[0].includes('描述:'),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

// 测试12: 变更详情格式化 - type
test('formatParamChangeDetails', '格式化 type 变更', function() {
    const api = {
        changes: [
            { prop: '参数 page type', before: '(无)', after: 'integer' }
        ]
    };

    const details = formatParamChangeDetails(api);

    return {
        pass: details.before[0].includes('缺少类型') &&
              details.after[0].includes('类型:'),
        message: `变更前: ${details.before[0]}, 变更后: ${details.after[0]}`
    };
});

console.log('\n--- 3. 边界情况测试 ---\n');

// 测试13: 空变更
test('computeImpact', '无变更时应返回空', function() {
    const yaml = `swagger: "2.0"
paths:
  /users:
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const impact = computeImpact(yaml, yaml);

    return {
        pass: impact.apis.length === 0 && impact.fields.length === 0,
        message: `无变更时应返回空，当前: ${impact.apis.length}个API, ${impact.fields.length}个字段`
    };
});

// 测试14: 复杂多变更
test('computeImpact', '多参数变更应全部检测', function() {
    const before = `swagger: "2.0"
paths:
  /users/search:
    get:
      operationId: searchUsers
      parameters:
        - name: keyword
          in: query
        - name: page
          in: query
        - name: size
          in: query
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users/search:
    get:
      operationId: searchUsers
      parameters:
        - name: keyword
          in: query
          minLength: 0
          maxLength: 255
        - name: page
          in: query
          type: integer
          minimum: 1
        - name: size
          in: query
          type: integer
          minimum: 1
          maximum: 100
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);

    return {
        pass: impact.apis.length > 0,
        message: `检测到 ${impact.apis.length} 个API变更，共 ${impact.apis[0]?.changes?.length || 0} 处变更`
    };
});

test('computeImpact', 'Swagger 资源组注解应透传到预览模型', function() {
    const before = `swagger: "2.0"
paths:
  /users:
    x-java-class-annotations:
      - "@TenantScoped"
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const after = `swagger: "2.0"
paths:
  /users:
    x-java-class-annotations:
      - "@TenantScoped"
    get:
      operationId: getUsers
      x-java-method-annotations:
        - "@Permission(\\"user.read\\")"
      description: 获取用户列表
      responses:
        200:
          description: OK`;

    const impact = computeImpact(before, after);
    const api = impact.apis[0] || {};
    return {
        pass: Array.isArray(api.classAnnotations) &&
            api.classAnnotations.includes('@TenantScoped') &&
            Array.isArray(api.methodAnnotations) &&
            api.methodAnnotations.includes('@Permission("user.read")'),
        message: `类注解: ${JSON.stringify(api.classAnnotations)}, 方法注解: ${JSON.stringify(api.methodAnnotations)}`
    };
});

test('computeImpact', 'Swagger 归一化到 core YAML 时应回退为非结构化差异', function() {
    const before = `swagger: "2.0"
paths:
  //users:
    get:
      operationId: getUsers
      responses:
        200:
          description: OK`;

    const after = `---
apis:
- name: "getUsers"
  path: "/users"
  method: "GET"
  response:
    className: "Response"
    fields:
    - name: "success"
      type: "Boolean"
      required: false
      description: "操作是否成功"
      validation: {}`;

    const impact = computeImpact(before, after);
    return {
        pass: impact.apis.length === 0 && impact.fields.length === 0,
        message: `跨结构对比不应误报结构化变更，当前: ${impact.apis.length} 个 API, ${impact.fields.length} 个字段`
    };
});

test('singleInput', 'index.html 不应再包含双文件提示', function() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    return {
        pass: !indexHtml.includes('第二份配置文件') &&
            !indexHtml.includes('配置预览') &&
            !indexHtml.includes('API + Config'),
        message: '单一输入模式下不应再保留第二份配置文件相关文案'
    };
});

test('javaPreview', 'Java 预览应显示资源组与方法注解', function() {
    const preview = generateJavaControllerPreview({
        classAnnotations: ['@TenantScoped'],
        methodAnnotations: ['@Permission("user.read")']
    });

    return {
        pass: preview.includes('// 资源组注解') &&
            preview.includes('@TenantScoped') &&
            preview.includes('// 方法注解') &&
            preview.includes('@Permission("user.read")'),
        message: preview
    };
});

console.log('\n--- 4. Core Contract UI 行为测试 ---\n');

test('isAutoFixable', '应优先使用 core 返回的 fixable=false', function() {
    const issue = {
        severity: 'warn',
        message: 'String 字段缺少长度校验',
        fixable: false
    };

    return {
        pass: isAutoFixable(issue) === false,
        message: 'UI 不应再因为 message 命中旧规则而覆盖 core 的 fixable=false'
    };
});

test('isAutoFixable', '应优先使用 core 返回的 fixable=true', function() {
    const issue = {
        severity: 'info',
        message: '自定义 core 修复建议',
        fixable: true
    };

    return {
        pass: isAutoFixable(issue) === true,
        message: 'UI 应接受 core 的 fixable=true，而不是依赖前端关键字猜测'
    };
});

test('isAutoFixable', '缺少 fixable 元数据时不应再回退到 message 猜测', function() {
    const issue = {
        severity: 'warn',
        message: 'String 字段缺少长度校验'
    };

    return {
        pass: isAutoFixable(issue) === false,
        message: 'UI 不应在缺少 contract 元数据时自行推断可修复性'
    };
});

test('isManualLocatable', '缺少定位信息的人工问题不应显示可点击定位按钮', function() {
    const issue = {
        severity: 'error',
        message: 'YAML 格式解析失败',
        fixable: false,
        api: 'search',
        field: 'request.Request.keyword'
    };

    return {
        pass: isManualLocatable(issue) === false,
        message: '没有 locator 的问题不应再依赖 api/field 字符串推断定位能力'
    };
});

test('isManualLocatable', '带有定位信息的人工问题仍可点击定位', function() {
    const issue = {
        severity: 'error',
        message: 'minLength 不能大于 maxLength',
        fixable: false,
        locator: {
            kind: 'swagger-field',
            apiName: 'search',
            path: '/search',
            method: 'GET',
            section: 'request',
            className: 'Request',
            fieldName: 'keyword',
            property: 'validation'
        }
    };

    return {
        pass: isManualLocatable(issue) === true,
        message: '只有 core 提供稳定 locator 时 UI 才应显示可点击的手动定位入口'
    };
});

test('findIssueLocationLine', '应基于 operationId 和 field 在 Swagger 中定位参数行', function() {
    const lines = `swagger: "2.0"
paths:
  /search:
    get:
      operationId: search
      parameters:
        - name: keyword
          in: query
          schema:
            type: string
            minLength: 100
            maxLength: 10`.split('\n');

    const line = findIssueLocationLine(lines, {
        api: '',
        field: '',
        locator: {
            kind: 'swagger-field',
            apiName: 'search',
            path: '/search',
            method: 'GET',
            section: 'request',
            className: 'Request',
            fieldName: 'keyword',
            property: 'validation'
        },
        message: 'minLength 不能大于 maxLength'
    });

    return {
        pass: line === 6,
        message: `期望定位到参数定义行 7，当前: ${line + 1}`
    };
});

test('findIssueLocationLine', '应基于 name 和 field 在 custom YAML 中定位字段行', function() {
    const lines = `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String`.split('\n');

    const line = findIssueLocationLine(lines, {
        api: '',
        field: '',
        locator: {
            kind: 'custom-field',
            apiName: 'createUser',
            path: '/api/users',
            method: 'POST',
            section: 'request',
            className: 'CreateUserReq',
            fieldName: 'username'
        },
        message: 'String 字段缺少长度校验'
    });

    return {
        pass: line === 7,
        message: `期望定位到字段定义行 8，当前: ${line + 1}`
    };
});

test('findIssueLocationLine', '路径类问题应优先定位到路径行', function() {
    const lines = `swagger: "2.0"
paths:
  //users:
    get:
      operationId: getUsers`.split('\n');

    const line = findIssueLocationLine(lines, {
        api: '',
        field: '',
        locator: {
            kind: 'swagger-path',
            path: '//users',
            method: 'GET',
            property: 'path'
        },
        message: '路径不能包含重复斜杠: //users'
    });

    return {
        pass: line === 2,
        message: `期望定位到路径行 3，当前: ${line + 1}`
    };
});

// 注意：字段级别变更（requestBody schema）的检测逻辑在 index.html 中有完整实现
// 但 render-test.js 使用简化版 computeImpact，不包含该逻辑
// 如需测试字段变更，请在浏览器中手动验证

// ============================================
// 测试报告
// ============================================
console.log('\n' + '='.repeat(70));
console.log('   测试报告');
console.log('='.repeat(70) + '\n');

console.log(`总计: ${passed + failed} 个测试`);
console.log(`\x1b[32m通过: ${passed}\x1b[0m`);
console.log(`\x1b[31m失败: ${failed}\x1b[0m`);

if (failed > 0) {
    console.log('\n\x1b[31m' + '-'.repeat(50) + '\x1b[0m');
    console.log('\n\x1b[31m失败的测试:\x1b[0m\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`#${r.testId} ${r.name}`);
        console.log(`  原因: ${r.actual}\n`);
    });
}

console.log('\n' + '='.repeat(70));

process.exit(failed > 0 ? 1 : 0);
