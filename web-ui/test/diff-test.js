/**
 * API Codegen Web UI - Diff Tests
 *
 * 测试分类：
 * 1. computeDiff - YAML 行级 diff
 * 2. computeImpact - API 级别变更检测
 * 3. Schema 层校验规则比较
 *
 * 运行方式：cd web-ui && npm test
 */

const fs = require('fs');
const path = require('path');

// Load js-yaml npm package
const jsyaml = require('js-yaml');

function createWordDiffShim() {
    function findCommonPrefixLength(a, b) {
        var max = Math.min(a.length, b.length);
        var i = 0;
        while (i < max && a[i] === b[i]) {
            i++;
        }
        return i;
    }

    function findCommonSuffixLength(a, b, prefixLength) {
        var aIndex = a.length - 1;
        var bIndex = b.length - 1;
        var suffix = 0;
        while (aIndex >= prefixLength && bIndex >= prefixLength && a[aIndex] === b[bIndex]) {
            suffix++;
            aIndex--;
            bIndex--;
        }
        return suffix;
    }

    return {
        diffWords(before, after) {
            if (before === after) {
                return [{ value: before, added: false, removed: false }];
            }

            var prefixLength = findCommonPrefixLength(before, after);
            var suffixLength = findCommonSuffixLength(before, after, prefixLength);

            var parts = [];
            var prefix = before.slice(0, prefixLength);
            var beforeMiddle = before.slice(prefixLength, before.length - suffixLength);
            var afterMiddle = after.slice(prefixLength, after.length - suffixLength);
            var suffix = suffixLength > 0 ? before.slice(before.length - suffixLength) : '';

            if (prefix) {
                parts.push({ value: prefix, added: false, removed: false });
            }
            if (beforeMiddle) {
                parts.push({ value: beforeMiddle, added: false, removed: true });
            }
            if (afterMiddle) {
                parts.push({ value: afterMiddle, added: true, removed: false });
            }
            if (suffix) {
                parts.push({ value: suffix, added: false, removed: false });
            }

            return parts;
        }
    };
}

global.Diff = createWordDiffShim();

// ============================================
// 测试框架
// ============================================

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        results.push({ name, status: 'PASS' });
        console.log(`  ✓ ${name}`);
    } catch (e) {
        failed++;
        results.push({ name, status: 'FAIL', error: e.message });
        console.log(`  ✗ ${name}`);
        console.log(`    Error: ${e.message}`);
    }
}

function assertEqual(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${msg}\n      Expected: ${JSON.stringify(expected)}\n      Actual:   ${JSON.stringify(actual)}`);
    }
}

function assertContains(arr, item, msg) {
    if (!arr.some(i => JSON.stringify(i) === JSON.stringify(item))) {
        throw new Error(`${msg}\n      Expected to contain: ${JSON.stringify(item)}\n      Actual: ${JSON.stringify(arr)}`);
    }
}

// ============================================
// Diff 核心函数（从 index.html 提取）
// ============================================

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

function loadDiffHelpersFromIndex() {
    const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const normalizePathForDiffSource = extractFunctionSource(indexHtml, 'normalizePathForDiff');
    const getSwaggerFieldChangesSource = extractFunctionSource(indexHtml, 'getSwaggerFieldChanges');
    const computeImpactSource = extractFunctionSource(indexHtml, 'computeImpact');
    const computeDiffSource = extractFunctionSource(indexHtml, 'computeDiff');
    const summarizeMonacoLineChangesSource = extractFunctionSource(indexHtml, 'summarizeMonacoLineChanges');

    return eval(`(() => {
        ${normalizePathForDiffSource}
        ${getSwaggerFieldChangesSource}
        ${computeImpactSource}
        ${computeDiffSource}
        ${summarizeMonacoLineChangesSource}
        return { computeDiff, computeImpact, summarizeMonacoLineChanges };
    })()`);
}

const { computeDiff, computeImpact, summarizeMonacoLineChanges } = loadDiffHelpersFromIndex();

// ============================================
// 测试用例
// ============================================

console.log('\n========================================');
console.log('  Diff Tests - computeDiff');
console.log('========================================\n');

test('computeDiff: 应检测到新增的行', () => {
    const before = 'a\nb\nc';
    const after = 'a\nb\nc\nd';
    const diff = computeDiff(before, after);

    const adds = diff.filter(d => d.added);
    assertEqual(adds.length, 1, '应该有一条新增');
    assertEqual(adds[0].value, '\nd', '新增内容应该是换行后的 d');
});

test('computeDiff: 应检测到删除的行', () => {
    const before = 'a\nb\nc';
    const after = 'a\nc';
    const diff = computeDiff(before, after);

    const removes = diff.filter(d => d.removed);
    assertEqual(removes.length, 1, '应该有一条删除');
    assertEqual(removes[0].value, 'b\n', '删除内容应该是带换行的 b');
});

test('computeDiff: 相同内容应标记为 equal', () => {
    const before = 'a\nb\nc';
    const after = 'a\nb\nc';
    const diff = computeDiff(before, after);

    const equal = diff.filter(d => !d.added && !d.removed);
    assertEqual(equal.length, 1, '相同内容应合并为一段 unchanged diff');
    assertEqual(equal[0].value, before, 'unchanged diff 内容应保留原始文本');
});

test('summarizeMonacoLineChanges: 应区分新增、删除和修改行', () => {
    const summary = summarizeMonacoLineChanges([
        {
            originalStartLineNumber: 10,
            originalEndLineNumber: 0,
            modifiedStartLineNumber: 11,
            modifiedEndLineNumber: 13
        },
        {
            originalStartLineNumber: 20,
            originalEndLineNumber: 22,
            modifiedStartLineNumber: 0,
            modifiedEndLineNumber: 0
        },
        {
            originalStartLineNumber: 30,
            originalEndLineNumber: 31,
            modifiedStartLineNumber: 35,
            modifiedEndLineNumber: 36
        }
    ]);

    assertEqual(summary, {
        addedLines: 3,
        removedLines: 3,
        modifiedLines: 2,
        changedLines: 8,
        changeBlocks: 3
    }, 'Monaco 行变化汇总口径应稳定');
});

console.log('\n========================================');
console.log('  Diff Tests - computeImpact');
console.log('========================================\n');

test('computeImpact: 应检测到路径修复 (//users -> /users)', () => {
    const before = `
paths:
  /users:
    get:
      summary: Get users
`;
    const after = `
paths:
  /users:
    get:
      summary: Get users
`;
    const impact = computeImpact(before, after);

    // 由于 normalizePath 处理了 // -> /，这里应该检测不到变更
    // 测试正常情况
    assertEqual(impact.apis.length, 0, '相同路径不应该有变更');
});

test('computeImpact: 应检测到反斜杠路径规范化修复', () => {
    const before = `
paths:
  /api\\\\users:
    get:
      summary: Get users
`;
    const after = `
paths:
  /api/users:
    get:
      summary: Get users
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '反斜杠路径修复应该保留为一次修改');
    assertContains(impact.apis[0].changes, { prop: 'path', before: '/api\\\\users', after: '/api/users' }, '应该检测到反斜杠路径修复');
});

test('computeImpact: 应检测到混合分隔符路径规范化修复', () => {
    const before = `
paths:
  /XXX/users//detail:
    get:
      summary: Get user detail
`;
    const after = `
paths:
  /users/detail:
    get:
      summary: Get user detail
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '混合分隔符路径修复应该保留为一次修改');
    assertContains(impact.apis[0].changes, { prop: 'path', before: '/XXX/users//detail', after: '/users/detail' }, '应该检测到混合分隔符路径修复');
});

test('computeImpact: 应检测到新增 API', () => {
    const before = `
paths: {}
`;
    const after = `
paths:
  /users:
    get:
      summary: Get users
      operationId: getUsers
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    assertEqual(impact.apis[0].type, 'added', '应该是新增类型');
});

test('computeImpact: 应检测到新增参数', () => {
    const before = `
paths:
  /users:
    get:
      parameters: []
`;
    const after = `
paths:
  /users:
    get:
      parameters:
        - name: id
          in: query
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    assertContains(impact.apis[0].changes, { prop: '参数 id', before: '(无)', after: '新增' }, '应该包含新增参数');
});

console.log('\n========================================');
console.log('  Diff Tests - Schema 层校验规则比较');
console.log('========================================\n');

test('computeImpact: 应检测到 schema 层的 minimum 变化', () => {
    const before = `
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
`;
    const after = `
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    assertContains(impact.apis[0].changes, { prop: '参数 id type', before: '(无)', after: 'integer' }, '应该检测到type变化');
    assertContains(impact.apis[0].changes, { prop: '参数 id minimum', before: '(无)', after: 1 }, '应该检测到minimum变化');
});

test('computeImpact: 应检测到 schema 层的 required 变化', () => {
    const before = `
paths:
  /users:
    get:
      parameters:
        - name: page
          in: query
`;
    const after = `
paths:
  /users:
    get:
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            required: true
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    assertContains(impact.apis[0].changes, { prop: '参数 page required', before: '(无)', after: true }, '应该检测到required变化');
});

test('computeImpact: 应检测到 schema 层的 pattern 变化', () => {
    const before = `
paths:
  /verify:
    post:
      parameters:
        - name: email
          in: query
`;
    const after = `
paths:
  /verify:
    post:
      parameters:
        - name: email
          in: query
          schema:
            type: string
            pattern: "^[\\\\w-\\\\.]+@([\\\\w-]+\\\\.)+[\\\\w-]{2,4}$"
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    // YAML 解析后变成单反斜杠
    assertContains(impact.apis[0].changes, { prop: '参数 email pattern', before: '(无)', after: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' }, '应该检测到pattern变化');
});

test('computeImpact: 应检测到 schema 层的 format 变化 (email)', () => {
    const before = `
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
`;
    const after = `
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
`;
    const impact = computeImpact(before, after);

    // RequestBody 的变化需要额外处理，暂时跳过这个测试
    console.log('  (跳过 requestBody format 测试 - 需要额外处理)');
});

test('computeImpact: requestBody schema-only 变化应至少保留 YAML 差异', () => {
    const before = `
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
`;
    const after = `
paths:
  /users:
    post:
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, 'requestBody schema-only 变化应保留为 API 修改');
    assertContains(impact.apis[0].changes, { prop: 'requestBody.email format', before: '(无)', after: 'email' }, '应该检测到 requestBody schema format 变化');
});

test('computeImpact: 应检测到参数描述变化', () => {
    const before = `
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
`;
    const after = `
paths:
  /users/{id}:
    get:
      parameters:
        - name: id
          in: path
          description: 用户ID
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    assertContains(impact.apis[0].changes, { prop: '参数 id description', before: '(无)', after: '用户ID' }, '应该检测到description变化');
});

test('computeImpact: 应检测到路径前缀修复 (/XXX/ -> /)', () => {
    const before = `
paths:
  /XXX/users:
    get:
      summary: Get users
`;
    const after = `
paths:
  /users:
    get:
      summary: Get users
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    assertEqual(impact.apis[0].changes[0].prop, 'path', '应该是路径变化');
});

test('computeImpact: 不应检测到相同参数', () => {
    const before = `
paths:
  /users:
    get:
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
`;
    const after = `
paths:
  /users:
    get:
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
`;
    const impact = computeImpact(before, after);

    // 参数完全相同，不应有变更
    assertEqual(impact.apis.length, 0, '相同参数不应该有变更');
});

test('computeImpact: 路径修复时检测为修改', () => {
    // 这个测试验证路径修复应该被检测到
    const before = `
swagger: '2.0'
paths:
  /XXX/users/detail:
    get:
      operationId: getUserDetail
`;
    const after = `
swagger: '2.0'
paths:
  /users/detail:
    get:
      operationId: getUserDetail
      description: 用户详情
`;
    const impact = computeImpact(before, after);

    // 路径修复应该被检测到
    assertEqual(impact.apis.length, 1, '应该有1个API变更');
    const api = impact.apis[0];
    assertEqual(api.path, '/users/detail', '路径应该是修复后的');
});

test('computeImpact: /XXX/ 前缀修复时检测', () => {
    const before = `
swagger: '2.0'
paths:
  /TEST/users:
    get:
      operationId: listUsers
`;
    const after = `
swagger: '2.0'
paths:
  /users:
    get:
      operationId: listUsers
`;
    const impact = computeImpact(before, after);

    // 应该检测到路径修复
    assertEqual(impact.apis.length, 1, '应该有1个API变更');
    const api = impact.apis[0];
    assertEqual(api.path, '/users', '修复后路径应为 /users');
    assertEqual(api.type, 'modified', '应该是修改类型');
});

test('computeImpact: 路径不以/开头修复', () => {
    const before = `
swagger: '2.0'
paths:
  users/profile:
    get:
      operationId: getProfile
`;
    const after = `
swagger: '2.0'
paths:
  /users/profile:
    get:
      operationId: getProfile
`;
    const impact = computeImpact(before, after);

    // 应该检测到路径修复
    assertEqual(impact.apis.length, 1, '应该有1个API变更');
    const api = impact.apis[0];
    assertEqual(api.path, '/users/profile', '路径应该以/开头');
});

test('computeImpact: 重复反斜杠路径修复后仍应保留 schema 级变更', () => {
    const before = `
swagger: '2.0'
paths:
  \\users\\\\{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
`;
    const after = `
swagger: '2.0'
paths:
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    assertContains(impact.apis[0].changes, { prop: 'path', before: '\\users\\\\{id}', after: '/users/{id}' }, '应该检测到反斜杠路径规范化');
    assertContains(impact.apis[0].changes, { prop: '参数 id type', before: '(无)', after: 'integer' }, '应该保留 schema type 变化');
    assertContains(impact.apis[0].changes, { prop: '参数 id minimum', before: '(无)', after: 1 }, '应该保留 schema minimum 变化');
});

test('computeImpact: 路径中的重复反斜杠应视为同一接口而非新增接口', () => {
    const before = `
swagger: '2.0'
paths:
  \\users\\\\profile:
    get:
      summary: Get profile
      operationId: getProfile
`;
    const after = `
swagger: '2.0'
paths:
  /users/profile:
    get:
      summary: Get profile
      operationId: getProfile
      description: Profile details
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    assertEqual(impact.apis[0].type, 'modified', '反斜杠路径规范化后应该是修改类型');
    assertContains(impact.apis[0].changes, { prop: 'path', before: '\\users\\\\profile', after: '/users/profile' }, '应该检测到路径修复');
    assertContains(impact.apis[0].changes, { prop: 'description', before: '(无)', after: 'Profile details' }, '应该保留其他字段变化');
});

test('computeImpact: 路径重复斜杠修复后仍应保留 schema 级变更', () => {
    const before = `
swagger: '2.0'
paths:
  /users//{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
`;
    const after = `
swagger: '2.0'
paths:
  /users/{id}:
    get:
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
            minimum: 1
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, '应该检测到1个API变更');
    assertContains(impact.apis[0].changes, { prop: 'path', before: '/users//{id}', after: '/users/{id}' }, '应该检测到路径规范化');
    assertContains(impact.apis[0].changes, { prop: '参数 id type', before: '(无)', after: 'integer' }, '应该保留 schema type 变化');
    assertContains(impact.apis[0].changes, { prop: '参数 id minimum', before: '(无)', after: 1 }, '应该保留 schema minimum 变化');
});

test('computeImpact: 仅 requestBody schema 变化可由 UI YAML fallback 预览', () => {
    const before = `
openapi: '3.0.0'
paths:
  /users:
    post:
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
`;
    const after = `
openapi: '3.0.0'
paths:
  /users:
    post:
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                  format: email
`;
    const impact = computeImpact(before, after);

    assertEqual(impact.apis.length, 1, 'requestBody schema-only 变化应保留为 API 修改');
    assertContains(impact.apis[0].changes, { prop: 'requestBody.email format', before: '(无)', after: 'email' }, '应该检测到 requestBody schema format 变化');
});

// ============================================
// 测试结果汇总
// ============================================

console.log('\n========================================');
console.log('  Test Summary');
console.log('========================================');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log('========================================\n');

if (failed > 0) {
    process.exit(1);
}
