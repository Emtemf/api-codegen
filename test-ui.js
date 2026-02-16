/**
 * UI Automation Test Script
 * Tests the Web UI workflow:
 * 1. Load Swagger example
 * 2. Analyze validation
 * 3. Show validation errors
 * 4. Auto-fix
 * 5. Show diff preview
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8892;

// Simple HTTP server
const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    let filePath = path.join(__dirname, 'web-ui', urlPath);

    // Security check
    if (!filePath.startsWith(path.join(__dirname, 'web-ui'))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.png': 'image/png',
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

async function runTest() {
    await new Promise(resolve => server.listen(PORT, resolve));
    console.log(`Server started on port ${PORT}`);

    let browser;
    try {
        browser = await chromium.launch({
            executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    } catch (e) {
        try {
            browser = await chromium.launch({ headless: true });
        } catch (e2) {
            console.error('Failed to launch browser:', e2.message);
            process.exit(1);
        }
    }

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    // Test scenarios
    const scenarios = [
        {
            name: 'swagger',
            url: `http://localhost:${PORT}/index.html?demo=swagger`,
            screenshot: 'docs/images/05-swagger-analyze.png'
        }
    ];

    for (const scenario of scenarios) {
        console.log(`\n=== Testing: ${scenario.name} ===`);

        // Step 1: Load the page
        console.log('Step 1: Loading page...');
        await page.goto(scenario.url, { waitUntil: 'load', timeout: 30000 });
        await page.waitForTimeout(3000);

        // Wait for CodeMirror to load
        await page.waitForSelector('.CodeMirror', { timeout: 15000 }).catch(() => {});
        console.log('  Page loaded');

        // Take screenshot of initial state
        await page.screenshot({ path: 'docs/images/05-initial-state.png', fullPage: true });
        console.log('  Screenshot: 05-initial-state.png');

        // Step 2: Click analyze button
        console.log('Step 2: Clicking analyze...');
        const analyzeBtn = await page.$('button:has-text("分析")');
        if (analyzeBtn) {
            await analyzeBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: scenario.screenshot, fullPage: true });
            console.log(`  Screenshot: ${scenario.screenshot}`);
        }

        // Step 3: Show validation results
        console.log('Step 3: Validation results shown');
        await page.screenshot({ path: 'docs/images/06-validation-results.png', fullPage: true });
        console.log('  Screenshot: 06-validation-results.png');

        // Step 4: Click auto-fix button
        console.log('Step 4: Clicking auto-fix...');
        const fixBtn = await page.$('button:has-text("自动修复")');
        if (fixBtn) {
            await fixBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'docs/images/07-after-fix.png', fullPage: true });
            console.log('  Screenshot: 07-after-fix.png');
        }

        // Step 5: Click diff preview button
        console.log('Step 5: Clicking diff preview...');
        const diffBtn = await page.$('button:has-text("对比预览")');
        if (diffBtn) {
            await diffBtn.click();
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'docs/images/08-diff-preview.png', fullPage: true });
            console.log('  Screenshot: 08-diff-preview.png');
        }
    }

    // Now test OpenAPI example
    console.log('\n=== Testing: openapi ===');

    await page.goto(`http://localhost:${PORT}/index.html?demo=openapi`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.waitForSelector('.CodeMirror', { timeout: 15000 }).catch(() => {});
    await page.screenshot({ path: 'docs/images/09-openapi-initial.png', fullPage: true });
    console.log('  Screenshot: 09-openapi-initial.png');

    const analyzeBtn2 = await page.$('button:has-text("分析")');
    if (analyzeBtn2) {
        await analyzeBtn2.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'docs/images/10-openapi-analyze.png', fullPage: true });
        console.log('  Screenshot: 10-openapi-analyze.png');
    }

    await browser.close();
    server.close();
    console.log('\n=== All tests completed ===');
    console.log('Screenshots saved to docs/images/');
}

runTest().catch(console.error);
