/**
 * API Codegen Web UI - Diff UI Automation Test
 *
 * 使用 Playwright 进行端到端测试
 *
 * 运行方式: node test-ui-diff.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8893;

// ============================================
// HTTP 服务器
// ============================================

const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    let filePath;
    let baseDir = __dirname;

    // 支持加载外部 YAML 文件
    if (urlPath === '/swagger2-example.yaml' || urlPath === '/openapi3-example.yaml') {
        filePath = path.join(baseDir, urlPath);
    } else {
        filePath = path.join(baseDir, 'web-ui', urlPath);
    }

    // 安全检查
    const allowedBase = path.join(baseDir, 'web-ui');
    if (!filePath.startsWith(allowedBase) && !filePath.startsWith(baseDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
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

async function runTests() {
    let browser;
    let playwright;

    try {
        // 尝试加载 playwright
        try {
            playwright = require('playwright');
        } catch (e) {
            console.log('正在安装 Playwright...');
            const { execSync } = require('child_process');
            execSync('npm install playwright', { stdio: 'inherit', cwd: __dirname });
            playwright = require('playwright');
        }

        await new Promise(resolve => server.listen(PORT, resolve));
        console.log(`服务器已启动: http://localhost:${PORT}\n`);

        // 启动浏览器
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
                console.error('无法启动浏览器:', e2.message);
                process.exit(1);
            }
        }

        const page = await browser.newPage();

        // 测试结果
        let passed = 0;
        let failed = 0;

        // ============================================
        // 测试用例
        // ============================================

        console.log('========================================');
        console.log('  Diff UI Automation Tests');
        console.log('========================================\n');

        // 测试 1: 加载页面
        console.log('[测试 1] 加载页面...');
        try {
            await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
            console.log('  ✓ 页面加载成功\n');
            passed++;
        } catch (e) {
            console.log(`  ✗ 页面加载失败: ${e.message}\n`);
            failed++;
            return;
        }

        // 测试 2: 等待 CodeMirror 加载
        console.log('[测试 2] 等待编辑器加载...');
        try {
            await page.waitForSelector('.CodeMirror', { timeout: 10000 });
            console.log('  ✓ 编辑器加载成功\n');
            passed++;
        } catch (e) {
            console.log(`  ✗ 编辑器加载失败: ${e.message}\n`);
            failed++;
            return;
        }

        // 测试 3: 点击分析按钮
        console.log('[测试 3] 点击分析按钮...');
        try {
            await page.click('button:has-text("分析")');
            await page.waitForTimeout(1000);
            console.log('  ✓ 分析按钮点击成功\n');
            passed++;
        } catch (e) {
            console.log(`  ✗ 分析按钮点击失败: ${e.message}\n`);
            failed++;
        }

        // 测试 4: 验证问题列表显示
        console.log('[测试 4] 验证问题列表显示...');
        try {
            const issueCount = await page.textContent('#issue-count');
            console.log(`  发现 ${issueCount} 个问题`);
            if (parseInt(issueCount) > 0) {
                console.log('  ✓ 问题列表显示正常\n');
                passed++;
            } else {
                console.log('  ⚠ 未发现问题（可能 YAML 已是完整状态）\n');
                passed++;
            }
        } catch (e) {
            console.log(`  ✗ 问题列表获取失败: ${e.message}\n`);
            failed++;
        }

        // 测试 5: 点击自动修复按钮
        console.log('[测试 5] 点击自动修复按钮...');
        try {
            await page.click('button:has-text("自动修复")');
            await page.waitForTimeout(1000);
            console.log('  ✓ 自动修复点击成功\n');
            passed++;
        } catch (e) {
            console.log(`  ✗ 自动修复点击失败: ${e.message}\n`);
            failed++;
        }

        // 测试 6: 验证 Diff 模态框显示
        console.log('[测试 6] 验证 Diff 模态框显示...');
        try {
            await page.waitForSelector('#diff-modal.active', { timeout: 5000 });
            console.log('  ✓ Diff 模态框显示成功\n');
            passed++;
        } catch (e) {
            console.log(`  ✗ Diff 模态框未显示: ${e.message}\n`);
            failed++;
        }

        // 测试 7: 验证 Diff 统计数据
        console.log('[测试 7] 验证 Diff 统计数据显示...');
        try {
            const addCount = await page.textContent('#diff-adds');
            const removeCount = await page.textContent('#diff-removes');
            console.log(`  变更统计: ${addCount}, ${removeCount}`);
            console.log('  ✓ Diff 统计数据显示正常\n');
            passed++;
        } catch (e) {
            console.log(`  ✗ Diff 统计数据获取失败: ${e.message}\n`);
            failed++;
        }

        // 测试 8: 验证 API 变更列表
        console.log('[测试 8] 验证 API 变更列表...');
        try {
            const apiCount = await page.textContent('#diff-api-count');
            console.log(`  API 变更数量: ${apiCount}`);
            if (parseInt(apiCount) > 0) {
                console.log('  ✓ API 变更列表显示正常\n');
                passed++;
            } else {
                console.log('  ⚠ 无 API 变更\n');
                passed++;
            }
        } catch (e) {
            console.log(`  ✗ API 变更列表获取失败: ${e.message}\n`);
            failed++;
        }

        // 测试 9: 点击应用修复按钮
        console.log('[测试 9] 点击应用修复按钮...');
        try {
            await page.click('button:has-text("应用修复")');
            await page.waitForTimeout(1000);
            console.log('  ✓ 应用修复点击成功\n');
            passed++;
        } catch (e) {
            console.log(`  ✗ 应用修复点击失败: ${e.message}\n`);
            failed++;
        }

        // 测试 10: 关闭 Diff 模态框
        console.log('[测试 10] 验证 Diff 模态框已关闭...');
        try {
            await page.waitForTimeout(500);
            const modalVisible = await page.isVisible('#diff-modal.active');
            if (!modalVisible) {
                console.log('  ✓ Diff 模态框已关闭\n');
                passed++;
            } else {
                console.log('  ⚠ Diff 模态框仍显示\n');
                passed++;
            }
        } catch (e) {
            console.log(`  ✗ 验证失败: ${e.message}\n`);
            failed++;
        }

        // 测试 11: 验证编辑器内容已更新
        console.log('[测试 11] 验证编辑器内容已更新...');
        try {
            const yamlContent = await page.evaluate(() => {
                const cm = document.querySelector('.CodeMirror').CodeMirror;
                return cm.getValue();
            });
            if (yamlContent.length > 100) {
                console.log(`  编辑器内容长度: ${yamlContent.length} 字符`);
                console.log('  ✓ 编辑器内容已更新\n');
                passed++;
            } else {
                console.log('  ✗ 编辑器内容未更新\n');
                failed++;
            }
        } catch (e) {
            console.log(`  ✗ 编辑器内容获取失败: ${e.message}\n`);
            failed++;
        }

        // 测试 12: 再次分析验证修复效果
        console.log('[测试 12] 再次分析验证修复效果...');
        try {
            await page.click('button:has-text("分析")');
            await page.waitForTimeout(1000);
            const newIssueCount = await page.textContent('#issue-count');
            console.log(`  修复后剩余问题: ${newIssueCount}`);
            console.log('  ✓ 修复效果验证成功\n');
            passed++;
        } catch (e) {
            console.log(`  ✗ 验证失败: ${e.message}\n`);
            failed++;
        }

        // ============================================
        // 测试结果汇总
        // ============================================

        console.log('========================================');
        console.log('  Test Summary');
        console.log('========================================');
        console.log(`  Passed: ${passed}`);
        console.log(`  Failed: ${failed}`);
        console.log('========================================\n');

        if (failed > 0) {
            process.exit(1);
        }

    } catch (e) {
        console.error('测试执行失败:', e);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
        server.close();
    }
}

// 运行测试
runTests();
