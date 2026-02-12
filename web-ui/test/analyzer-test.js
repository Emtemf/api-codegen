/**
 * API Codegen Web UI - Analyzer Tests
 *
 * 测试分类：
 * 1. 错误检测 (Error Detection) - 检测 YAML 结构缺失/错误
 * 2. 校验规则 (Validation Rules) - 检查校验注解完整性
 * 3. 自动修复 (Auto-fix) - 验证自动修复功能，展示修复前后对比
 * 4. 边界情况 (Edge Cases) - 特殊场景处理
 *
 * 运行方式：cd web-ui && npm test
 */

const fs = require('fs');
const path = require('path');

// Load js-yaml npm package
const jsyaml = require('js-yaml');

// Read and modify the analyzer to work in Node.js
let analyzerCode = fs.readFileSync(path.join(__dirname, '..', 'js', 'analyzer.js'), 'utf8');

// Remove the window export (we only need module.exports)
analyzerCode = analyzerCode.replace(
    /if \(typeof window !== 'undefined'\)[\s\S]*?window\.ApiYamlAnalyzer = ApiYamlAnalyzer;[\s\S]*?}/,
    ''
);

// Execute the analyzer code
eval(analyzerCode);

// Get the analyzer class from module.exports
const ApiYamlAnalyzer = module.exports || global.ApiYamlAnalyzer;

// ============================================
// 测试框架
// ============================================

let passed = 0;
let failed = 0;
const results = [];

/**
 * 格式化 YAML 用于显示（缩进）
 */
function formatYaml(yaml, indent = '      ') {
    return yaml.split('\n').map(line => indent + line).join('\n');
}

/**
 * 提取关键字段用于对比显示
 */
function extractFieldSummary(parsed) {
    if (!parsed.apis || !parsed.apis[0]) return 'N/A';
    const api = parsed.apis[0];
    const field = api.request?.fields?.[0] || api.response?.fields?.[0];
    if (!field) return 'N/A';
    return {
        name: field.name,
        type: field.type,
        required: field.required,
        validation: field.validation || '(无)'
    };
}

/**
 * 测试用例定义
 */
function test(category, scenario, input, expected, fn) {
    const testId = `${results.length + 1}`;
    try {
        const analyzer = new ApiYamlAnalyzer();
        const actualIssues = fn ? fn(analyzer, input) : analyzer.analyze(input);

        const errors = actualIssues.filter(i => i.severity === 'error');
        const warnings = actualIssues.filter(i => i.severity === 'warn');

        // 验证预期结果
        const validations = [];

        if (expected.errorCount !== undefined && errors.length !== expected.errorCount) {
            validations.push(`错误数量: 预期 ${expected.errorCount}, 实际 ${errors.length}`);
        }

        if (expected.warnCount !== undefined && warnings.length !== expected.warnCount) {
            validations.push(`警告数量: 预期 ${expected.warnCount}, 实际 ${warnings.length}`);
        }

        if (expected.hasMessage !== undefined) {
            const found = actualIssues.some(i => i.message.includes(expected.hasMessage));
            if (!found) validations.push(`未找到预期消息: "${expected.hasMessage}"`);
        }

        if (expected.notHasMessage !== undefined) {
            const found = actualIssues.some(i => i.message.includes(expected.notHasMessage));
            if (found) validations.push(`不应存在消息: "${expected.notHasMessage}"`);
        }

        // 自动修复验证
        let fixedYaml = null;
        if (expected.fixedValue !== undefined) {
            fixedYaml = analyzer.fix(input);
            const parsed = jsyaml.load(fixedYaml);
            if (!expected.fixedValue(parsed)) {
                validations.push(`自动修复结果不符合预期`);
            }
        }

        if (validations.length > 0) {
            throw new Error(validations.join('; '));
        }

        passed++;
        results.push({
            testId, category, scenario, status: 'PASS',
            input, expected, fixedYaml,
            actual: { errorCount: errors.length, warnCount: warnings.length }
        });

        console.log(`\x1b[32m[PASS]\x1b[0m #${testId} ${scenario}`);

        // 显示修复前后对比
        if (fixedYaml) {
            const beforeParsed = jsyaml.load(input);
            const afterParsed = jsyaml.load(fixedYaml);
            const beforeField = extractFieldSummary(beforeParsed);
            const afterField = extractFieldSummary(afterParsed);

            console.log(`      \x1b[90m修复前:\x1b[0m validation: ${JSON.stringify(beforeField.validation)}`);
            console.log(`      \x1b[92m修复后:\x1b[0m validation: ${JSON.stringify(afterField.validation)}`);
        }

    } catch (e) {
        failed++;
        results.push({
            testId, category, scenario, status: 'FAIL',
            input, expected,
            actual: e.message
        });
        console.log(`\x1b[31m[FAIL]\x1b[0m #${testId} ${scenario}`);
        console.log(`       原因: ${e.message}`);
    }
}

// ============================================
// 测试用例
// ============================================

console.log('\n' + '='.repeat(70));
console.log('   API YAML Analyzer - 测试套件');
console.log('='.repeat(70));

// ============================================
// 分类 1: 错误检测
// ============================================
console.log('\n\x1b[36m┌─ 分类 1: 错误检测 (YAML 结构)\x1b[0m');
console.log('\x1b[36m│\x1b[0m');

test('错误检测', '空内容应被检测为错误',
    '',
    { errorCount: 1, hasMessage: '空' },
    (analyzer, input) => analyzer.analyze(input)
);

test('错误检测', '缺少 apis 字段应报错',
    'name: test\nversion: 1.0',
    { errorCount: 1, hasMessage: 'apis' },
    (analyzer, input) => analyzer.analyze(input)
);

test('错误检测', '缺少 API 名称应报错',
    `apis:
  - path: /api/users
    method: POST`,
    { errorCount: 1, hasMessage: '名称' }
);

test('错误检测', '缺少 API 路径应报错',
    `apis:
  - name: createUser
    method: POST`,
    { errorCount: 1, hasMessage: '路径' }
);

test('错误检测', '路径不以 / 开头应报错',
    `apis:
  - name: createUser
    path: api/users
    method: POST`,
    { errorCount: 1, hasMessage: '/' }
);

test('错误检测', '路径包含 // 应报错 (Issue #2)',
    `apis:
  - name: createUser
    path: /api//users
    method: POST`,
    { errorCount: 1, hasMessage: '//' }
);

test('错误检测', 'Swagger 格式应警告并提示转换 (Issue #4)',
    `swagger: '2.0'
info:
  version: v1
  title: 用户管理 API
paths:
  /users:
    get:
      summary: 获取用户列表`,
    { warnCount: 1, hasMessage: 'Swagger' }
);

test('错误检测', 'OpenAPI 格式应警告并提示转换 (Issue #4)',
    `openapi: '3.0'
info:
  title: 示例 API
paths:
  /users:
    get:
      summary: 获取用户`,
    { warnCount: 1, hasMessage: 'OpenAPI' }
);

test('错误检测', '缺少 HTTP 方法应报错',
    `apis:
  - name: createUser
    path: /api/users`,
    { errorCount: 1, hasMessage: '方法' }
);

test('错误检测', '无效的 HTTP 方法应警告',
    `apis:
  - name: createUser
    path: /api/users
    method: INVALID`,
    { warnCount: 1, hasMessage: 'GET' }
);

test('错误检测', 'minLength > maxLength 应报错',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
          validation:
            minLength: 20
            maxLength: 10`,
    { errorCount: 1, hasMessage: 'minLength' }
);

test('错误检测', 'min > max 应报错',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: age
          type: Integer
          validation:
            min: 100
            max: 10`,
    { errorCount: 1, hasMessage: 'min' }
);

test('错误检测', 'minSize > maxSize 应报错',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: items
          type: List<String>
          validation:
            minSize: 10
            maxSize: 5`,
    { errorCount: 1, hasMessage: 'minSize' }
);

// ============================================
// 分类 2: 校验规则
// ============================================
console.log('\n\x1b[36m┌─ 分类 2: 校验规则 (字段校验)\x1b[0m');
console.log('\x1b[36m│\x1b[0m');

test('校验规则', '必填字段缺少 @NotNull 应报错',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
          required: true`,
    { errorCount: 1, hasMessage: '@NotNull' }
);

test('校验规则', 'String 字段无任何校验应警告',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: description
          type: String`,
    { warnCount: 1, hasMessage: 'String' }
);

test('校验规则', '邮箱字段缺少 @Email 应警告',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: userEmail
          type: String
          validation: {}`,
    { warnCount: 2, hasMessage: '@Email' }
);

test('校验规则', '电话字段缺少正则应警告',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: mobilePhone
          type: String
          validation: {}`,
    { warnCount: 2, hasMessage: '正则' }
);

test('校验规则', '数值字段缺少范围应警告',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: count
          type: Integer
          validation: {}`,
    { warnCount: 1, hasMessage: '范围' }
);

test('校验规则', 'List 字段缺少大小应警告',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: items
          type: List<String>
          validation: {}`,
    { warnCount: 1, hasMessage: '大小' }
);

test('校验规则', '生日字段缺少 @Past 应警告',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: birthday
          type: LocalDate
          validation: {}`,
    { warnCount: 1, hasMessage: '@Past' }
);

test('校验规则', '完整有效的 YAML 应无错误',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
          required: true
          validation:
            notNull: true
            minLength: 4
            maxLength: 20
        - name: email
          type: String
          required: true
          validation:
            notNull: true
            email: true
    response:
      className: CreateUserRsp
      fields:
        - name: userId
          type: Long`,
    { errorCount: 0 }
);

// ============================================
// 分类 3: 自动修复（带对比展示）
// ============================================
console.log('\n\x1b[36m┌─ 分类 3: 自动修复 (修复前后对比)\x1b[0m');
console.log('\x1b[36m│\x1b[0m');

test('自动修复', '必填字段 → 添加 notNull: true',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
          required: true`,
    { fixedValue: (parsed) => {
        const field = parsed.apis[0].request.fields[0];
        return field.validation && field.validation.notNull === true;
    }}
);

test('自动修复', 'String 字段 → 添加 minLength/maxLength',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: name
          type: String`,
    { fixedValue: (parsed) => {
        const field = parsed.apis[0].request.fields[0];
        return field.validation.minLength === 1 && field.validation.maxLength === 255;
    }}
);

test('自动修复', '邮箱字段 → 添加 email: true',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: userEmail
          type: String`,
    { fixedValue: (parsed) => {
        const field = parsed.apis[0].request.fields[0];
        return field.validation.email === true;
    }}
);

test('自动修复', '电话字段 → 添加手机号正则',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: mobilePhone
          type: String`,
    { fixedValue: (parsed) => {
        const field = parsed.apis[0].request.fields[0];
        return field.validation.pattern === '^1[3-9]\\d{9}$';
    }}
);

test('自动修复', 'Integer 字段 → 添加 min/max 范围',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: count
          type: Integer`,
    { fixedValue: (parsed) => {
        const field = parsed.apis[0].request.fields[0];
        return field.validation.min === 0 && field.validation.max === 2147483647;
    }}
);

test('自动修复', 'Long 字段 → 添加 Long 范围',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: id
          type: Long`,
    { fixedValue: (parsed) => {
        const field = parsed.apis[0].request.fields[0];
        return field.validation.min === 0 && field.validation.max === 9223372036854775807;
    }}
);

test('自动修复', 'Double 字段 → 添加 Double 范围',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: price
          type: Double`,
    { fixedValue: (parsed) => {
        const field = parsed.apis[0].request.fields[0];
        return field.validation.min === 0.0 && field.validation.max === 9999999999.0;
    }}
);

test('自动修复', 'List 字段 → 添加 minSize/maxSize',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: tags
          type: List<String>`,
    { fixedValue: (parsed) => {
        const field = parsed.apis[0].request.fields[0];
        return field.validation.minSize === 1 && field.validation.maxSize === 100;
    }}
);

test('自动修复', '生日字段 → 添加 past: true',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: birthday
          type: LocalDate`,
    { fixedValue: (parsed) => {
        const field = parsed.apis[0].request.fields[0];
        return field.validation.past === true;
    }}
);

// ============================================
// 分类 4: 边界情况
// ============================================
console.log('\n\x1b[36m┌─ 分类 4: 边界情况\x1b[0m');
console.log('\x1b[36m│\x1b[0m');

test('边界情况', '多个 API 应全部检测',
    `apis:
  - name: getUser
    path: /api/users
    method: GET
  - name: deleteUser
    path: /api/users
    method: DELETE`,
    { errorCount: 0 }
);

test('边界情况', '嵌套对象字段（当前不递归检测）',
    `apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: profile
          type: Object
          fields:
            - name: nickname
              type: String`,
    { errorCount: 0, warnCount: 0 }
);

test('边界情况', 'Response 字段也应检测',
    `apis:
  - name: getUser
    path: /api/users
    method: GET
    response:
      className: GetUserRsp
      fields:
        - name: data
          type: String`,
    { warnCount: 1, hasMessage: 'String' }
);

test('边界情况', 'YAML 解析错误应捕获',
    `apis:
  - name: test
    path: /api/test
    method: POST
    request:
      className: TestReq
      fields:
        - name: field
          type: String
          invalid yaml here`,
    { errorCount: 1, hasMessage: '解析错误' }
);

// ============================================
// 测试报告
// ============================================
console.log('\n' + '='.repeat(70));
console.log('   测试报告');
console.log('='.repeat(70) + '\n');

// 汇总
console.log(`总计: ${passed + failed} 个测试`);
console.log(`\x1b[32m通过: ${passed}\x1b[0m`);
console.log(`\x1b[31m失败: ${failed}\x1b[0m`);

// 失败详情
if (failed > 0) {
    console.log('\n\x1b[31m' + '-'.repeat(50) + '\x1b[0m');
    console.log('\x1b[31m失败的测试:\x1b[0m\n');
    results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`#${r.testId} ${r.scenario}`);
        console.log(`  预期: ${JSON.stringify(r.expected)}`);
        console.log(`  实际: ${r.actual}\n`);
    });
}

// 分类汇总
console.log('\n' + '-'.repeat(50));
console.log('分类汇总:\n');

const categories = [...new Set(results.map(r => r.category))];
categories.forEach(cat => {
    const catResults = results.filter(r => r.category === cat);
    const catPassed = catResults.filter(r => r.status === 'PASS').length;
    const icon = catPassed === catResults.length ? '✓' : '✗';
    console.log(`  ${icon} ${cat}: ${catPassed}/${catResults.length} 通过`);
});

console.log('\n' + '='.repeat(70));

process.exit(failed > 0 ? 1 : 0);
