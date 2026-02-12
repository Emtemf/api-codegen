const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

async function takeScreenshot(url, outputPath, options = {}) {
    const {
        width = 1920,
        height = 1080,
        waitUntil = 'networkidle0',
        fullPage = false
    } = options;

    // Find Chrome executable
    const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium'
    ];

    let executablePath = null;
    for (const chromePath of chromePaths) {
        if (fs.existsSync(chromePath)) {
            executablePath = chromePath;
            break;
        }
    }

    if (!executablePath) {
        throw new Error('Chrome executable not found');
    }

    console.log(`Using Chrome: ${executablePath}`);

    const browser = await puppeteer.launch({
        executablePath,
        headless: false,  // 显示浏览器窗口
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--start-maximized'  // 最大化窗口
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });

    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil });

    // Wait a bit for any dynamic content
    await new Promise(resolve => setTimeout(resolve, 1000));

    await page.screenshot({
        path: outputPath,
        fullPage
    });

    await browser.close();
    console.log(`Screenshot saved to: ${outputPath}`);
}

// CLI usage
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node screenshot.js <url> <output-path> [width] [height]');
    console.log('Example: node screenshot.js http://localhost:8080 output.png 1920 1080');
    process.exit(1);
}

const [url, outputPath] = args;
takeScreenshot(url, outputPath)
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
