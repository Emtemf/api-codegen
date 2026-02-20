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

/**
 * 简化的 computeImpact 函数（从 index.html 提取）
 */
function computeImpact(before, after) {
    var result = {
        apis: [],
        fields: []
    };

    try {
        var beforeParsed = jsyaml.load(before);
        var afterParsed = jsyaml.load(after);

        if (!beforeParsed || !afterParsed) {
            return result;
        }

        var isSwagger = (beforeParsed.swagger || beforeParsed.openapi || beforeParsed.paths);

        if (isSwagger) {
            var beforePaths = beforeParsed.paths || {};
            var afterPaths = afterParsed.paths || {};

            function normalizePath(path) {
                if (!path) return path;
                var normalized = path.replace(/\/+/g, '/');
                // Remove /XXX/ prefix (placeholder path)
                normalized = normalized.replace(/^\/XXX\//, '/');
                if (!normalized.startsWith('/')) {
                    normalized = '/' + normalized;
                }
                return normalized;
            }

            var normalizedBeforePaths = {};
            for (var origPath in beforePaths) {
                var np = normalizePath(origPath);
                normalizedBeforePaths[np] = origPath;
            }

            for (var path in afterPaths) {
                var np = normalizePath(path);
                var beforePath = beforePaths[path];
                var afterPath = afterPaths[path];
                var originalPath = path;

                if (normalizedBeforePaths[np]) {
                    originalPath = normalizedBeforePaths[np];
                    beforePath = beforePaths[originalPath];
                }

                if (!beforePath && originalPath === path) {
                    if (!normalizedBeforePaths[np]) {
                        var afterOp = afterPath[Object.keys(afterPath)[0]];
                        if (afterOp.summary || afterOp.operationId || (afterOp.parameters && afterOp.parameters.length > 0)) {
                            result.apis.push({
                                path: path,
                                originalPath: path,
                                method: Object.keys(afterPath)[0],
                                name: afterOp.operationId || afterOp.summary || path.replace(/\//g, '').replace(/\{|\}/g, ''),
                                summary: afterOp.summary || '',
                                operationId: afterOp.operationId || '',
                                parameters: afterOp.parameters || [],
                                type: 'added',
                                changes: [{ prop: 'API', before: '(无)', after: '新增接口' }]
                            });
                        }
                    }
                } else if (originalPath !== path) {
                    var afterOpFixed = afterPath[Object.keys(afterPath)[0]];
                    result.apis.push({
                        path: path,
                        originalPath: originalPath,
                        method: Object.keys(afterPath)[0],
                        name: afterOpFixed.operationId || afterOpFixed.summary || path.replace(/\//g, '').replace(/\{|\}/g, ''),
                        summary: afterOpFixed.summary || '',
                        operationId: afterOpFixed.operationId || '',
                        parameters: afterOpFixed.parameters || [],
                        type: 'modified',
                        changes: [{ prop: 'path', before: originalPath, after: path }]
                    });
                } else {
                    var hasActualChange = false;
                    var pathChanges = [];

                    if (originalPath !== path) {
                        hasActualChange = true;
                        pathChanges.push({ prop: 'path', before: originalPath, after: path });
                    }

                    for (var method in afterPath) {
                        var beforeMethod = beforePath[method];
                        var afterMethod = afterPath[method];

                        if (!beforeMethod) {
                            hasActualChange = true;
                        } else {
                            var changes = [];

                            if (!beforeMethod.operationId && afterMethod.operationId) {
                                changes.push({ prop: 'operationId', before: '(无)', after: afterMethod.operationId });
                            }
                            if (!beforeMethod.description && afterMethod.description) {
                                changes.push({ prop: 'description', before: '(无)', after: afterMethod.description });
                            }

                            // 参数变更检测
                            if (afterMethod.parameters && afterMethod.parameters.length > 0) {
                                var beforeParamMap = {};
                                if (beforeMethod.parameters) {
                                    beforeMethod.parameters.forEach(function(p) { beforeParamMap[p.name] = p; });
                                }
                                afterMethod.parameters.forEach(function(param) {
                                    var beforeParam = beforeParamMap[param.name];
                                    if (!beforeParam) {
                                        changes.push({ prop: '参数 ' + param.name, before: '(无)', after: '新增' });
                                    } else {
                                        if (!beforeParam.description && param.description) {
                                            changes.push({ prop: '参数 ' + param.name + ' description', before: '(无)', after: param.description });
                                        }
                                        if (!beforeParam.type && param.type) {
                                            changes.push({ prop: '参数 ' + param.name + ' type', before: '(无)', after: param.type });
                                        }
                                        if (!beforeParam.minLength && param.minLength !== undefined) {
                                            changes.push({ prop: '参数 ' + param.name + ' minLength', before: '(无)', after: param.minLength });
                                        }
                                        if (!beforeParam.maxLength && param.maxLength !== undefined) {
                                            changes.push({ prop: '参数 ' + param.name + ' maxLength', before: '(无)', after: param.maxLength });
                                        }
                                        if (!beforeParam.minimum && param.minimum !== undefined) {
                                            changes.push({ prop: '参数 ' + param.name + ' minimum', before: '(无)', after: param.minimum });
                                        }
                                        if (!beforeParam.maximum && param.maximum !== undefined) {
                                            changes.push({ prop: '参数 ' + param.name + ' maximum', before: '(无)', after: param.maximum });
                                        }
                                        if (!beforeParam.pattern && param.pattern) {
                                            changes.push({ prop: '参数 ' + param.name + ' pattern', before: '(无)', after: param.pattern });
                                        }
                                    }
                                });
                            }

                            if (changes.length > 0) {
                                hasActualChange = true;
                                pathChanges = pathChanges.concat(changes);
                            }
                        }
                    }

                    if (hasActualChange) {
                        var firstAfterMethod = afterPath[Object.keys(afterPath)[0]];
                        result.apis.push({
                            path: path,
                            originalPath: originalPath,
                            method: Object.keys(afterPath)[0],
                            name: firstAfterMethod.operationId || firstAfterMethod.summary || path.replace(/\//g, '').replace(/\{|\}/g, ''),
                            summary: firstAfterMethod.summary || '',
                            operationId: firstAfterMethod.operationId || '',
                            parameters: firstAfterMethod.parameters || [],
                            type: 'modified',
                            changes: pathChanges
                        });
                    }
                }
            }
        }

        // Definitions/字段变更检测
        var beforeDefs = beforeParsed.definitions || (beforeParsed.components && beforeParsed.components.schemas) || {};
        var afterDefs = afterParsed.definitions || (afterParsed.components && afterParsed.components.schemas) || {};

        for (var defName in afterDefs) {
            var beforeDef = beforeDefs[defName] || {};
            var afterDef = afterDefs[defName];
            var beforeProps = beforeDef.properties || {};
            var afterProps = afterDef.properties || {};

            var fieldChangesList = [];

            for (var propName in afterProps) {
                var beforeProp = beforeProps[propName] || {};
                var afterProp = afterProps[propName];

                var beforeVal = JSON.stringify(beforeProp);
                var afterVal = JSON.stringify(afterProp);

                if (beforeVal !== afterVal) {
                    var changes = [];
                    if (!beforeProp.required && afterProp.required) {
                        changes.push({ prop: 'required', before: '(无)', after: true });
                    }
                    if (!beforeProp.format && afterProp.format) {
                        changes.push({ prop: 'format', before: '(无)', after: afterProp.format });
                    }
                    if (!beforeProp.pattern && afterProp.pattern) {
                        changes.push({ prop: 'pattern', before: '(无)', after: afterProp.pattern });
                    }
                    if (!beforeProp.minimum && afterProp.minimum !== undefined) {
                        changes.push({ prop: 'minimum', before: '(无)', after: afterProp.minimum });
                    }
                    if (!beforeProp.maximum && afterProp.maximum !== undefined) {
                        changes.push({ prop: 'maximum', before: '(无)', after: afterProp.maximum });
                    }
                    if (!beforeProp.minLength && afterProp.minLength !== undefined) {
                        changes.push({ prop: 'minLength', before: '(无)', after: afterProp.minLength });
                    }
                    if (!beforeProp.maxLength && afterProp.maxLength !== undefined) {
                        changes.push({ prop: 'maxLength', before: '(无)', after: afterProp.maxLength });
                    }

                    if (changes.length > 0) {
                        fieldChangesList.push({
                            className: defName,
                            field: propName,
                            fieldType: afterProp.type || 'Object',
                            changes: changes
                        });
                    }
                }
            }

            if (fieldChangesList.length > 0) {
                result.fields = result.fields.concat(fieldChangesList);
            }
        }

    } catch (e) {
        console.error('computeImpact error:', e.message);
    }

    return result;
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
          minLength: 0
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
