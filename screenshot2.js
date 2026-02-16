const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8891;

// Simple HTTP server that properly serves files
const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    let filePath = path.join(__dirname, 'web-ui', urlPath);

    // Security: prevent directory traversal
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
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif'
    };

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.log(`404: ${req.url}`);
            res.writeHead(404);
            res.end('Not found: ' + req.url);
            return;
        }
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(data);
    });
});

async function takeScreenshot() {
    await new Promise(resolve => server.listen(PORT, resolve));
    console.log(`Server started on port ${PORT}`);

    let browser;
    try {
        browser = await chromium.launch({
            executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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

    const screenshots = [
        { url: `http://localhost:${PORT}/index.html?demo=swagger`, name: '01-swagger-demo' },
        { url: `http://localhost:${PORT}/index.html?demo=openapi`, name: '02-openapi-demo' }
    ];

    for (const shot of screenshots) {
        console.log(`Taking screenshot: ${shot.name}`);
        try {
            await page.goto(shot.url, { waitUntil: 'load', timeout: 30000 });
            console.log(`  Page loaded, waiting for content...`);

            // Wait for the YAML editor to be visible
            await page.waitForSelector('.CodeMirror', { timeout: 15000 }).catch(() => {
                console.log('  Warning: CodeMirror not found');
            });

            // Additional wait for any animations
            await page.waitForTimeout(2000);

            // Check if there's any content
            const yamlEditor = await page.$('.CodeMirror');
            if (yamlEditor) {
                console.log('  YAML editor found');
            }

            await page.screenshot({
                path: `docs/images/${shot.name}.png`,
                fullPage: true,
                type: 'png'
            });

            const stats = fs.statSync(`docs/images/${shot.name}.png`);
            console.log(`  Screenshot saved, size: ${stats.size} bytes`);
        } catch (err) {
            console.error(`  Error: ${err.message}`);
        }
    }

    await browser.close();
    server.close();
    console.log('Done');
}

takeScreenshot().catch(console.error);
