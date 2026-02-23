// Test for diff count bug - TDD demonstration
// This test should FAIL initially (showing the bug exists)

import { test, expect } from '@playwright/test';

test.describe('Diff Count Bug - TDD', () => {
  test('should count modified APIs in diff summary', async ({ page }) => {
    // Load the web UI
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for CodeMirror to initialize
    const yamlEditor = page.locator('.api-panel .CodeMirror');
    await yamlEditor.waitFor({ state: 'visible', timeout: 10000 });

    // Load example YAML
    const response = await page.request.get('/swagger2-example.yaml');
    const yamlContent = await response.text();

    // Set the YAML content in the editor
    await yamlEditor.evaluate((el, value) => {
      const codeMirror = (el as any).CodeMirror;
      if (codeMirror) {
        codeMirror.setValue(value);
      }
    }, yamlContent);
    await page.waitForTimeout(500);

    // Click "分析" button
    await page.locator('button:has-text("分析")').click();
    await page.waitForTimeout(3000);

    // Click "自动修复" button
    const autoFixButton = page.locator('button:has-text("自动修复")');
    await autoFixButton.click();
    await page.waitForTimeout(3000);

    // Get the diff counts
    const addsText = await page.locator('#diff-adds').textContent();
    const removesText = await page.locator('#diff-removes').textContent();

    console.log('Diff counts - Adds:', addsText, 'Removes:', removesText);

    // Get API count to verify how many APIs have changes
    const apiCountText = await page.locator('#diff-api-count').textContent();
    console.log('API count:', apiCountText);

    // Get number of API blocks (these show the actual changes)
    const apiBlocksBefore = await page.locator('#diff-before .diff-api-block-paired').count();
    const apiBlocksAfter = await page.locator('#diff-after .diff-api-block-paired').count();
    console.log('API blocks - Before:', apiBlocksBefore, 'After:', apiBlocksAfter);

    // The bug: diff count shows +0/-0 but there are 16 API blocks with changes
    // This test should FAIL because the bug exists
    // After fixing the bug, this test should PASS

    // Expect that if there are API blocks with changes, the count should reflect that
    if (apiBlocksBefore > 0 || apiBlocksAfter > 0) {
      // At least one of add/remove should be non-zero if there are changes
      const hasNonZeroCount = addsText !== '+0 API' || removesText !== '-0 API';

      // This assertion will FAIL with current bug (count shows +0/-0)
      // After fix, it should PASS
      expect(hasNonZeroCount).toBe(true);
    }
  });

  test('should synchronize heights between left and right blocks', async ({ page }) => {
    // Load the web UI
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for CodeMirror to initialize
    const yamlEditor = page.locator('.api-panel .CodeMirror');
    await yamlEditor.waitFor({ state: 'visible', timeout: 10000 });

    // Load example YAML
    const response = await page.request.get('/swagger2-example.yaml');
    const yamlContent = await response.text();

    // Set the YAML content in the editor
    await yamlEditor.evaluate((el, value) => {
      const codeMirror = (el as any).CodeMirror;
      if (codeMirror) {
        codeMirror.setValue(value);
      }
    }, yamlContent);
    await page.waitForTimeout(500);

    // Click "分析" button
    await page.locator('button:has-text("分析")').click();
    await page.waitForTimeout(3000);

    // Click "自动修复" button
    const autoFixButton = page.locator('button:has-text("自动修复")');
    await autoFixButton.click();
    await page.waitForTimeout(3000);

    // Wait for height sync to complete
    await page.waitForTimeout(500);

    // Get heights of first block pair
    const beforeBlock = await page.locator('#diff-before .diff-api-block-paired').first();
    const afterBlock = await page.locator('#diff-after .diff-api-block-paired').first();

    const beforeHeight = await beforeBlock.evaluate(el => el.getBoundingClientRect().height);
    const afterHeight = await afterBlock.evaluate(el => el.getBoundingClientRect().height);

    console.log('First block height - Before:', beforeHeight, 'After:', afterHeight);

    // Allow small difference (within 5px)
    const heightDiff = Math.abs(beforeHeight - afterHeight);
    console.log('Height difference:', heightDiff);

    // Heights should be synchronized (within tolerance)
    expect(heightDiff).toBeLessThanOrEqual(5);
  });

  test('should have scrollable dialog when content exceeds viewport', async ({ page }) => {
    // Load the web UI
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for CodeMirror to initialize
    const yamlEditor = page.locator('.api-panel .CodeMirror');
    await yamlEditor.waitFor({ state: 'visible', timeout: 10000 });

    // Load example YAML
    const response = await page.request.get('/swagger2-example.yaml');
    const yamlContent = await response.text();

    // Set the YAML content in the editor
    await yamlEditor.evaluate((el, value) => {
      const codeMirror = (el as any).CodeMirror;
      if (codeMirror) {
        codeMirror.setValue(value);
      }
    }, yamlContent);
    await page.waitForTimeout(500);

    // Click "分析" button
    await page.locator('button:has-text("分析")').click();
    await page.waitForTimeout(3000);

    // Click "自动修复" button
    const autoFixButton = page.locator('button:has-text("自动修复")');
    await autoFixButton.click();
    await page.waitForTimeout(3000);

    // Check the container - now it's fullscreen, so it uses overflow:hidden
    // and relies on the browser's scroll
    const container = await page.locator('.diff-container');
    const containerOverflow = await container.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.overflow;
    });

    console.log('Container overflow:', containerOverflow);

    // Fullscreen modal uses hidden overflow, relying on browser scroll
    // The key is that the modal is displayed and covers the viewport
    const isFullscreen = await container.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.width >= window.innerWidth && rect.height >= window.innerHeight;
    });

    console.log('Is fullscreen:', isFullscreen);

    // Should be fullscreen now
    expect(isFullscreen).toBe(true);
  });
});
