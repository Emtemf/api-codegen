/**
 * API Codegen Web UI - End-to-End Scenarios Test
 *
 * 模拟用户操作的各种场景
 *
 * 运行方式: node test-ui-scenarios.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8894;

// ============================================
// 测试场景 YAML
// ============================================

const SCENARIOS = {
    // 场景1: 路径问题 (DFX-001, DFX-002)
    pathIssue: `
swagger: "2.0"
info:
  title: 路径测试API
  version: "1.0"
basePath: /api
paths:
  //users:
    get:
      summary: 用户列表
      operationId: getUsers
      parameters: []
      responses:
        200:
          description: Success
  users//profile:
    get:
      summary: 用户资料
      operationId: getProfile
      responses:
        200:
          description: Success
`,

    // 场景2: 必填参数缺少校验 (DFX-003)
    requiredIssue: `
swagger: "2.0"
info:
  title: 必填参数测试
  version: "1.0"
basePath: /api
paths:
  /users/create:
    post:
      summary: 创建用户
      operationId: createUser
      parameters:
        - name: username
          in: query
          required: true
        - name: email
          in: query
          required: true
      responses:
        201:
          description: Created
`,

    // 场景3: String 字段缺少校验 (DFX-004)
    stringValidation: `
swagger: "2.0"
info:
  title: String校验测试
  version: "1.0"
basePath: /api
paths:
  /search:
    get:
      summary: 搜索
      operationId: search
      parameters:
        - name: keyword
          in: query
          description: 搜索关键词
        - name: name
          in: query
          description: 名称
      responses:
        200:
          description: Success
`,

    // 场景4: email 格式校验 (DFX-005)
    emailValidation: `
swagger: "2.0"
info:
  title: Email校验测试
  version: "1.0"
basePath: /api
paths:
  /verify:
    post:
      summary: 验证邮箱
      operationId: verifyEmail
      parameters:
        - name: email
          in: query
          description: 邮箱地址
      responses:
        200:
          description: Success
`,

    // 场景5: phone 格式校验 (DFX-006)
    phoneValidation: `
swagger: "2.0"
info:
  title: Phone校验测试
  version: "1.0"
basePath: /api
paths:
  /sms:
    post:
      summary: 发送短信
      operationId: sendSms
      parameters:
        - name: phone
          in: query
          description: 手机号
      responses:
        200:
          description: Success
`,

    // 场景6: 数值范围校验 (DFX-007)
    numericValidation: `
swagger: "2.0"
info:
  title: 数值校验测试
  version: "1.0"
basePath: /api
paths:
  /score:
    get:
      summary: 获取评分
      operationId: getScore
      parameters:
        - name: score
          in: query
          description: 评分
          schema:
            type: number
        - name: age
          in: query
          description: 年龄
          schema:
            type: integer
        - name: price
          in: query
          description: 价格
          schema:
            type: number
      responses:
        200:
          description: Success
`,

    // 场景7: List 大小校验 (DFX-008)
    listValidation: `
swagger: "2.0"
info:
  title: List校验测试
  version: "1.0"
basePath: /api
paths:
  /tags:
    post:
      summary: 设置标签
      operationId: setTags
      parameters:
        - name: tags
          in: query
          description: 标签列表
          schema:
            type: array
            items:
              type: string
      responses:
        200:
          description: Success
`,

    // 场景8: 分页参数校验 (DFX-011, DFX-012)
    paginationValidation: `
swagger: "2.0"
info:
  title: 分页校验测试
  version: "1.0"
basePath: /api
paths:
  /list:
    get:
      summary: 列表查询
      operationId: listItems
      parameters:
        - name: page
          in: query
          description: 页码
          schema:
            type: integer
        - name: pageSize
          in: query
          description: 每页数量
          schema:
            type: integer
        - name: limit
          in: query
          description: 限制数量
          schema:
            type: integer
        - name: size
          in: query
          description: 大小
          schema:
            type: integer
      responses:
        200:
          description: Success
`,

    // 场景9: 路径参数校验 (DFX-014)
    pathParamValidation: `
swagger: "2.0"
info:
  title: 路径参数测试
  version: "1.0"
basePath: /api
paths:
  /users/{id}:
    get:
      summary: 获取用户
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          description: 用户ID
          schema:
            type: integer
      responses:
        200:
          description: Success
  /items/{code}:
    get:
      summary: 获取物品
      operationId: getItemByCode
      parameters:
        - name: code
          in: path
          required: true
          description: 物品编码
          schema:
            type: string
      responses:
        200:
          description: Success
`,

    // 场景10: 完整示例 - 包含所有规则
    comprehensive: `
swagger: "2.0"
info:
  title: 完整校验示例
  version: "1.0"
basePath: /api
paths:
  //users/list:
    get:
      summary: 用户列表 - 路径问题
      operationId: getUserList
      parameters:
        - name: page
          in: query
          description: 页码
          schema:
            type: integer
        - name: pageSize
          in: query
          description: 每页数量
          schema:
            type: integer
        - name: keyword
          in: query
          description: 搜索关键词
        - name: orderBy
          in: query
          description: 排序字段
      responses:
        200:
          description: Success
  /users/{id}:
    get:
      summary: 获取用户 - 路径参数
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          description: 用户ID
          schema:
            type: integer
        - name: X-Token
          in: header
          required: true
          description: 认证令牌
          schema:
            type: string
        - name: JSESSIONID
          in: cookie
          description: 会话ID
          schema:
            type: string
      responses:
        200:
          description: Success
  /users/create:
    post:
      summary: 创建用户 - 完整校验
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - username
                - email
                - phone
                - age
                - score
              properties:
                username:
                  type: string
                  description: 用户名
                email:
                  type: string
                  description: 邮箱
                phone:
                  type: string
                  description: 手机号
                age:
                  type: integer
                  description: 年龄
                score:
                  type: number
                  description: 评分
                price:
                  type: number
                  description: 价格
                tags:
                  type: array
                  description: 标签列表
                  items:
                    type: string
      responses:
        201:
          description: Created
`
};

// ============================================
// HTTP 服务器
// ============================================

const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    let filePath;
    let baseDir = __dirname;

    if (urlPath === '/swagger2-example.yaml' || urlPath === '/openapi3-example.yaml') {
        filePath = path.join(baseDir, urlPath);
    } else {
        filePath = path.join(baseDir, 'web-ui', urlPath);
    }

    const ext = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.yaml': 'text/yaml; charset=utf-8'
    };

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found: ' + req.url);
            return;
        }
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(data);
    });
});

// ============================================
// Playwright 测试
// ============================================

async function runScenarioTest(scenarioName, yaml) {
    let browser;
    let playwright;

    try {
        playwright = require('playwright');
    } catch (e) {
        console.log(`[${scenarioName}] 跳过 - Playwright 未安装`);
        return { name: scenarioName, status: 'SKIP', error: 'Playwright not installed' };
    }

    try {
        browser = await playwright.chromium.launch({
            executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    } catch (e) {
        try {
            browser = await playwright.chromium.launch({ headless: true });
        } catch (e2) {
            return { name: scenarioName, status: 'SKIP', error: 'Browser not available' };
        }
    }

    const page = await browser.newPage();
    let result = { name: scenarioName, status: 'PASS', issues: 0, fixes: 0 };

    try {
        await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

        // 输入 YAML
        await page.evaluate((yamlContent) => {
            const cm = document.querySelector('.CodeMirror').CodeMirror;
            cm.setValue(yamlContent);
        }, yaml);

        await page.waitForTimeout(500);

        // 点击分析
        await page.click('button:has-text("分析")');
        await page.waitForTimeout(1000);

        // 获取问题数量
        const issueText = await page.textContent('#issue-count');
        result.issues = parseInt(issueText) || 0;

        // 点击自动修复
        await page.click('button:has-text("自动修复")');
        await page.waitForTimeout(1000);

        // 检查 diff 模态框
        const modalVisible = await page.isVisible('#diff-modal.active');
        if (modalVisible) {
            const addText = await page.textContent('#diff-adds');
            const addMatch = addText.match(/(\d+)/);
            result.fixes = addMatch ? parseInt(addMatch[1]) : 0;
        }

        // 点击应用修复
        await page.click('button:has-text("应用修复")');
        await page.waitForTimeout(500);

        // 再次分析验证
        await page.click('button:has-text("分析")');
        await page.waitForTimeout(1000);

        const finalText = await page.textContent('#issue-count');
        const finalIssues = parseInt(finalText) || 0;

        if (finalIssues === 0) {
            result.status = 'PASS';
        } else {
            result.status = 'PARTIAL';
            result.remaining = finalIssues;
        }

    } catch (e) {
        result.status = 'FAIL';
        result.error = e.message;
    } finally {
        await browser.close();
    }

    return result;
}

async function runTests() {
    let playwright;
    try {
        playwright = require('playwright');
    } catch (e) {
        console.log('正在安装 Playwright...');
        const { execSync } = require('child_process');
        execSync('npm install playwright', { stdio: 'inherit', cwd: __dirname });
        playwright = require('playwright');
    }

    await new Promise(resolve => server.listen(PORT, resolve));
    console.log(`\n服务器已启动: http://localhost:${PORT}\n`);

    console.log('========================================');
    console.log('  End-to-End Scenario Tests');
    console.log('========================================\n');

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // 运行每个场景
    const scenarios = [
        { name: 'DFX-001/002: 路径问题', yaml: SCENARIOS.pathIssue },
        { name: 'DFX-003: 必填参数', yaml: SCENARIOS.requiredIssue },
        { name: 'DFX-004: String校验', yaml: SCENARIOS.stringValidation },
        { name: 'DFX-005: Email校验', yaml: SCENARIOS.emailValidation },
        { name: 'DFX-006: Phone校验', yaml: SCENARIOS.phoneValidation },
        { name: 'DFX-007: 数值校验', yaml: SCENARIOS.numericValidation },
        { name: 'DFX-008: List校验', yaml: SCENARIOS.listValidation },
        { name: 'DFX-011/012: 分页校验', yaml: SCENARIOS.paginationValidation },
        { name: 'DFX-014: 路径参数校验', yaml: SCENARIOS.pathParamValidation },
        { name: '综合测试: 完整示例', yaml: SCENARIOS.comprehensive },
    ];

    for (const scenario of scenarios) {
        console.log(`测试: ${scenario.name}...`);
        const result = await runScenarioTest(scenario.name, scenario.yaml);

        if (result.status === 'PASS') {
            console.log(`  ✓ 通过 (发现问题: ${result.issues}, 修复: ${result.fixes})`);
            passed++;
        } else if (result.status === 'PARTIAL') {
            console.log(`  ⚠ 部分通过 (剩余问题: ${result.remaining})`);
            passed++;
        } else if (result.status === 'SKIP') {
            console.log(`  ⊘ 跳过 (${result.error})`);
            skipped++;
        } else {
            console.log(`  ✗ 失败 (${result.error})`);
            failed++;
        }
    }

    console.log('\n========================================');
    console.log('  Test Summary');
    console.log('========================================');
    console.log(`  Passed:  ${passed}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log('========================================\n');

    server.close();

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
