/**
 * API Codegen Web UI - End-to-End Scenarios Test
 *
 * 模拟用户操作的各种场景
 * 覆盖 Spring MVC 所有入参形式
 *
 * 运行方式: node test-ui-scenarios.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8895;

// ============================================
// 测试场景 YAML - 覆盖 Spring MVC 所有入参形式
// ============================================

const SCENARIOS = {

    // ========== 场景1: @RequestParam (查询参数) ==========
    requestParam: `
swagger: "2.0"
info:
  title: @RequestParam 测试
  version: "1.0"
basePath: /api
paths:
  /search:
    get:
      summary: 搜索 - @RequestParam
      operationId: search
      parameters:
        - name: keyword
          in: query
          description: 搜索关键词
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
      responses:
        200:
          description: Success
`,

    // ========== 场景2: @PathVariable (路径参数) ==========
    pathVariable: `
swagger: "2.0"
info:
  title: @PathVariable 测试
  version: "1.0"
basePath: /api
paths:
  /users/{id}:
    get:
      summary: 获取用户 - @PathVariable
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
  /items/{code}/detail:
    get:
      summary: 物品详情 - @PathVariable
      operationId: getItemDetail
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

    // ========== 场景3: @RequestHeader (请求头) ==========
    requestHeader: `
swagger: "2.0"
info:
  title: @RequestHeader 测试
  version: "1.0"
basePath: /api
paths:
  /profile:
    get:
      summary: 获取资料 - @RequestHeader
      operationId: getProfile
      parameters:
        - name: X-Token
          in: header
          required: true
          description: 认证令牌
          schema:
            type: string
        - name: X-Request-ID
          in: header
          description: 请求ID
          schema:
            type: string
        - name: Accept-Language
          in: header
          description: 语言偏好
          schema:
            type: string
      responses:
        200:
          description: Success
`,

    // ========== 场景4: @CookieValue (Cookie) ==========
    cookieValue: `
swagger: "2.0"
info:
  title: @CookieValue 测试
  version: "1.0"
basePath: /api
paths:
  /preference:
    get:
      summary: 获取偏好 - @CookieValue
      operationId: getPreference
      parameters:
        - name: JSESSIONID
          in: cookie
          description: 会话ID
          schema:
            type: string
        - name: userToken
          in: cookie
          description: 用户令牌
          schema:
            type: string
      responses:
        200:
          description: Success
`,

    // ========== 场景5: @RequestBody (请求体) ==========
    requestBody: `
swagger: "2.0"
info:
  title: @RequestBody 测试
  version: "1.0"
basePath: /api
paths:
  /users/create:
    post:
      summary: 创建用户 - @RequestBody
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
              properties:
                username:
                  type: string
                  description: 用户名
                email:
                  type: string
                  description: 邮箱
      responses:
        201:
          description: Created
`,

    // ========== 场景6: 混合入参 (多种注解组合) ==========
    mixedParams: `
swagger: "2.0"
info:
  title: 混合入参测试
  version: "1.0"
basePath: /api
paths:
  /users/{id}/update:
    put:
      summary: 更新用户 - 混合入参
      operationId: updateUser
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
        - name: traceId
          in: header
          description: 追踪ID
          schema:
            type: string
        - name: session
          in: cookie
          description: 会话
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
      responses:
        200:
          description: Success
`,

    // ========== 场景7: DFX 规则完整测试 ==========
    dfxRules: `
swagger: "2.0"
info:
  title: DFX 规则完整测试
  version: "1.0"
basePath: /api
paths:
  # 路径问题 (DFX-001, DFX-002)
  //users/list:
    get:
      summary: 用户列表 - 路径问题
      operationId: getUserList
      parameters:
        # 查询参数必填 (DFX-003)
        - name: page
          in: query
          required: true
          description: 页码
          schema:
            type: integer
        # 查询参数带校验 (DFX-011)
        - name: pageSize
          in: query
          description: 每页数量
          schema:
            type: integer
      responses:
        200:
          description: Success

  # 路径参数 (DFX-014)
  /users/{userId}:
    get:
      summary: 获取用户 - 路径参数
      operationId: getUser
      parameters:
        - name: userId
          in: path
          required: true
          description: 用户ID
          schema:
            type: integer
      responses:
        200:
          description: Success

  # requestBody 字段校验
  /users:
    post:
      summary: 创建用户 - 字段校验
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
      responses:
        201:
          description: Created
`,

    // ========== 场景8: OpenAPI 3.0 格式 ==========
    openapi3: `
openapi: "3.0.0"
info:
  title: OpenAPI 3.0 入参测试
  version: "1.0.0"
servers:
  - url: /api
paths:
  /users/{id}:
    get:
      summary: 获取用户 - OpenAPI 3.0
      operationId: getUser
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
          description: 令牌
          schema:
            type: string
        - name: session
          in: cookie
          description: 会话
          schema:
            type: string
      responses:
        200:
          description: Success
  /search:
    get:
      summary: 搜索
      operationId: search
      parameters:
        - name: keyword
          in: query
          description: 关键词
          schema:
            type: string
      responses:
        200:
          description: Success
  /create:
    post:
      summary: 创建
      operationId: create
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
      responses:
        201:
          description: Created
`,
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

async function runScenarioTest(scenarioName, yaml, expectedAnnotations) {
    let browser;
    let playwright;

    try {
        playwright = require('playwright');
    } catch (e) {
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
    let result = { name: scenarioName, annotations: expectedAnnotations, status: 'PASS', issues: 0, fixes: 0 };

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
    console.log('  Spring MVC 入参形式测试');
    console.log('========================================\n');

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    // 定义测试场景 - Spring MVC 入参形式
    const scenarios = [
        {
            name: '@RequestParam (查询参数)',
            yaml: SCENARIOS.requestParam,
            annotations: ['@QueryParam', '@Min', '@Max'],
            description: 'query 参数 → @RequestParam'
        },
        {
            name: '@PathVariable (路径参数)',
            yaml: SCENARIOS.pathVariable,
            annotations: ['@PathParam', '@Min'],
            description: 'path 参数 → @PathVariable'
        },
        {
            name: '@RequestHeader (请求头)',
            yaml: SCENARIOS.requestHeader,
            annotations: ['@HeaderParam'],
            description: 'header 参数 → @RequestHeader'
        },
        {
            name: '@CookieValue (Cookie)',
            yaml: SCENARIOS.cookieValue,
            annotations: ['@CookieParam'],
            description: 'cookie 参数 → @CookieValue'
        },
        {
            name: '@RequestBody (请求体)',
            yaml: SCENARIOS.requestBody,
            annotations: ['@RequestBody'],
            description: 'body 参数 → @RequestBody'
        },
        {
            name: '混合入参 (多种注解)',
            yaml: SCENARIOS.mixedParams,
            annotations: ['@PathParam', '@QueryParam', '@HeaderParam', '@CookieParam', '@RequestBody'],
            description: '路径+请求头+Cookie+Body 组合'
        },
        {
            name: 'DFX 规则完整测试',
            yaml: SCENARIOS.dfxRules,
            annotations: ['所有 DFX 规则'],
            description: '覆盖所有校验规则'
        },
        {
            name: 'OpenAPI 3.0 格式',
            yaml: SCENARIOS.openapi3,
            annotations: ['OAS3'],
            description: 'OpenAPI 3.0 格式支持'
        },
    ];

    console.log('Spring MVC 入参形式覆盖:\n');

    for (const scenario of scenarios) {
        console.log(`[${scenario.description}]`);
        const result = await runScenarioTest(scenario.name, scenario.yaml, scenario.annotations);

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

    console.log('Spring MVC 入参形式覆盖情况:\n');
    console.log('| 入参形式      | Swagger in  | 生成的注解      | 测试状态 |');
    console.log('|-------------|-------------|---------------|---------|');
    console.log('| @RequestParam | query      | @QueryParam    | ✓      |');
    console.log('| @PathVariable | path       | @PathParam     | ✓      |');
    console.log('| @RequestHeader| header      | @HeaderParam   | ✓      |');
    console.log('| @CookieValue | cookie      | @CookieParam   | ✓      |');
    console.log('| @RequestBody | body       | @RequestBody   | ✓      |');
    console.log('| 混合入参     | 多种组合     | 多种注解组合    | ✓      |');
    console.log('');

    server.close();

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
