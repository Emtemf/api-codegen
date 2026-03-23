/**
 * API Codegen Web UI - Core bridge contract tests
 *
 * 验证 Web UI 默认只消费 api-codegen-core 提供的分析/修复能力。
 * 运行方式：cd web-ui && node test/core-bridge-test.js
 */

const assert = require('assert');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const WEB_UI_ROOT = path.resolve(__dirname, '..');
const CONTRACT_PATH = path.resolve(WEB_UI_ROOT, '..', 'api-codegen-core', 'src', 'main', 'resources', 'ui-bridge-contract.json');
const PORT = String(18080 + Math.floor(Math.random() * 1000));
const BASE_URL = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;

function logResult(ok, name, error) {
  if (ok) {
    passed++;
    console.log(`\x1b[32m[PASS]\x1b[0m ${name}`);
  } else {
    failed++;
    console.log(`\x1b[31m[FAIL]\x1b[0m ${name}`);
    console.log(`       原因: ${error.message}`);
  }
}

async function waitForServerReady(server) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('等待 server.js 启动超时'));
    }, 120000);

    function cleanup() {
      clearTimeout(timeout);
      server.stdout.off('data', onStdout);
      server.stderr.off('data', onStderr);
      server.off('exit', onExit);
    }

    function onStdout(chunk) {
      const text = chunk.toString();
      if (text.includes('Static server listening')) {
        cleanup();
        resolve();
      }
    }

    function onStderr(chunk) {
      const text = chunk.toString();
      if (text.trim()) {
        console.error(text.trim());
      }
    }

    function onExit(code) {
      cleanup();
      reject(new Error(`server.js 提前退出，exit code=${code}`));
    }

    server.stdout.on('data', onStdout);
    server.stderr.on('data', onStderr);
    server.on('exit', onExit);
  });
}

async function postJson(pathname, payload) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  assert.ok(response.ok, `请求 ${pathname} 失败: ${JSON.stringify(data)}`);
  return data;
}

async function postRaw(pathname, body) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  });

  const data = await response.json();
  return { response, data };
}

async function test(name, fn) {
  try {
    await fn();
    logResult(true, name);
  } catch (error) {
    logResult(false, name, error);
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('   API Codegen Web UI - Core Bridge Contract Tests');
  console.log('='.repeat(70));

  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

  const server = spawn('node', ['server.js'], {
    cwd: WEB_UI_ROOT,
    env: {
      ...process.env,
      PORT
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServerReady(server);

    await test('首页不再直接加载 legacy analyzer.js', async () => {
      const response = await fetch(`${BASE_URL}/`);
      const html = await response.text();
      assert.ok(response.ok, '首页请求失败');
      assert.ok(!html.includes('js/analyzer.js'), 'index.html 仍然引用 js/analyzer.js');
    });

    await test('首页不应再暴露 codegen-config.yaml 双文件输入提示', async () => {
      const response = await fetch(`${BASE_URL}/`);
      const html = await response.text();
      assert.ok(response.ok, '首页请求失败');
      assert.ok(!html.includes('codegen-config.yaml'), '首页仍然提示第二份配置文件');
      assert.ok(!html.includes('配置预览'), '首页仍然展示配置预览区域');
      assert.ok(!html.includes('API + Config'), '首页导航仍然暗示双文件输入');
    });

    await test('web 层契约元数据应来自共享 bridge contract 资源', async () => {
      assert.equal(contract.bridge, 'api-codegen-ui-bridge');
      assert.equal(contract.contractVersion, 1);
      assert.equal(contract.commands.analyze, 'analyze');
      assert.equal(contract.commands.fix, 'fix');
      assert.equal(contract.formats.custom, 'custom');
      assert.equal(contract.formats.swagger, 'swagger');
    });

    await test('analyze 接口应返回 core 检测到的 Swagger 路径问题', async () => {
      const swaggerYaml = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  //users:
    get:
      operationId: getUsers
      responses:
        200:
          description: Success
`.trim();

      const result = await postJson('/api/analyze', { yaml: swaggerYaml });
      const pathIssue = (result.issues || []).find(issue =>
        issue.message && issue.message.includes('路径不能包含重复斜杠'));

      assert.equal(result.bridge, contract.bridge);
      assert.equal(result.contractVersion, contract.contractVersion);
      assert.equal(result.command, contract.commands.analyze);
      assert.equal(result.sourceFormat, contract.formats.swagger);
      assert.equal(result.inputFormat, contract.formats.swagger);
      assert.equal(result.outputFormat, contract.formats.custom);
      assert.ok(pathIssue, '未返回 core 路径规范问题');
      assert.equal(pathIssue.fixable, true);
      assert.equal(pathIssue.ruleCode, 'DFX-001');
      assert.ok(pathIssue.key, 'core issue key 为空');
      assert.ok(pathIssue.locator, 'core path issue 应返回 locator');
      assert.equal(pathIssue.locator.kind, 'swagger-path');
      assert.equal(pathIssue.locator.path, '//users');
      assert.equal(pathIssue.locator.method, 'GET');
      assert.equal(pathIssue.locator.property, 'path');
    });

    await test('analyze 接口应返回结构化字段 locator，而不是要求前端解析 api/field 字符串', async () => {
      const swaggerYaml = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
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
            maxLength: 10
      responses:
        200:
          description: Success
`.trim();

      const result = await postJson('/api/analyze', { yaml: swaggerYaml });
      const rangeIssue = (result.issues || []).find(issue =>
        issue.message && issue.message.includes('minLength 不能大于 maxLength'));

      assert.ok(rangeIssue, '未返回 Swagger 字段校验问题');
      assert.ok(rangeIssue.locator, '字段问题缺少 locator');
      assert.equal(rangeIssue.locator.kind, 'swagger-field');
      assert.equal(rangeIssue.locator.apiName, 'search');
      assert.equal(rangeIssue.locator.path, '/search');
      assert.equal(rangeIssue.locator.method, 'GET');
      assert.equal(rangeIssue.locator.section, 'request');
      assert.equal(rangeIssue.locator.className, 'Request');
      assert.equal(rangeIssue.locator.fieldName, 'keyword');
    });

    await test('fix 接口应在 Swagger 输入下返回同格式 YAML', async () => {
      const swaggerYaml = `
swagger: "2.0"
info:
  title: Test API
  version: "1.0"
paths:
  //users:
    get:
      operationId: getUsers
      responses:
        200:
          description: Success
`.trim();

      const analysis = await postJson('/api/analyze', { yaml: swaggerYaml });
      const pathIssue = (analysis.issues || []).find(issue =>
        issue.message && issue.message.includes('路径不能包含重复斜杠'));
      assert.ok(pathIssue, '未返回待修复 issue');

      const fixed = await postJson('/api/fix', {
        yaml: swaggerYaml,
        selectedIssueKeys: [pathIssue.key]
      });

      assert.equal(fixed.bridge, contract.bridge);
      assert.equal(fixed.contractVersion, contract.contractVersion);
      assert.equal(fixed.command, contract.commands.fix);
      assert.equal(fixed.sourceFormat, contract.formats.swagger);
      assert.equal(fixed.inputFormat, contract.formats.swagger);
      assert.equal(fixed.outputFormat, contract.formats.swagger);
      assert.equal(fixed.fixedCount, 1);
      assert.ok((fixed.fixedYaml || '').includes('paths:'), '修复结果应保持 Swagger 结构');
      assert.ok(!(fixed.fixedYaml || '').includes('apis:'), '修复结果不应泄漏 core 内部 YAML');
      assert.ok((fixed.fixedYaml || '').includes('/users:'), '修复结果未规范化路径');
      assert.ok(!(fixed.fixedYaml || '').includes('//users'), '修复结果仍包含重复斜杠');
    });

    await test('analyze 失败时应返回带 bridge 元数据的 error envelope', async () => {
      const { response, data } = await postRaw('/api/analyze', '{"yaml":');

      assert.equal(response.status, 500);
      assert.equal(data.bridge, contract.bridge);
      assert.equal(data.contractVersion, contract.contractVersion);
      assert.equal(data.command, contract.commands.analyze);
      assert.equal(data.error.code, 'INVALID_JSON_BODY');
      assert.ok(data.error.message, '错误消息为空');
    });

    await test('fix 失败时应返回带 bridge 元数据的 error envelope', async () => {
      const { response, data } = await postRaw('/api/fix', '{"yaml":');

      assert.equal(response.status, 500);
      assert.equal(data.bridge, contract.bridge);
      assert.equal(data.contractVersion, contract.contractVersion);
      assert.equal(data.command, contract.commands.fix);
      assert.equal(data.error.code, 'INVALID_JSON_BODY');
      assert.ok(data.error.message, '错误消息为空');
    });
  } finally {
    server.kill('SIGINT');
    await new Promise(resolve => server.once('exit', resolve));
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`总计: ${passed + failed}, 通过: ${passed}, 失败: ${failed}`);
  console.log('-'.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
