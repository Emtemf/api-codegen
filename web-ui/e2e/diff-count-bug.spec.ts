// Test for diff count bug - TDD demonstration
// Updated for unified diff layout

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
    await page.getByRole('button', { name: '分析', exact: true }).click();
    await page.waitForTimeout(3000);

    // Click "自动修复" button
    const autoFixButton = page.locator('button:has-text("自动修复")');
    await autoFixButton.click();
    await page.waitForTimeout(3000);

    // Get the diff counts
    const addsText = await page.locator('#diff-adds').textContent();
    const removesText = await page.locator('#diff-removes').textContent();

    console.log('Diff counts - Adds:', addsText, 'Removes:', removesText);

    const monacoRootCount = await page.locator('#diff-unified #diff-monaco-root').count();
    const monacoDiffEditorCount = await page.locator('#diff-unified .monaco-diff-editor').count();
    const legacyPreviewCount = await page.locator('#diff-unified .diff-api-unified').count();

    console.log('Monaco roots:', monacoRootCount);
    console.log('Monaco diff editors:', monacoDiffEditorCount);
    console.log('Legacy preview blocks:', legacyPreviewCount);

    const hasNonZeroCount = addsText !== '0 处添加' || removesText !== '0 处删除';

    expect(monacoRootCount).toBe(1);
    expect(monacoDiffEditorCount).toBeGreaterThan(0);
    expect(legacyPreviewCount).toBe(0);
    expect(hasNonZeroCount).toBe(true);
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
    await page.getByRole('button', { name: '分析', exact: true }).click();
    await page.waitForTimeout(3000);

    // Click "自动修复" button
    const autoFixButton = page.locator('button:has-text("自动修复")');
    await autoFixButton.click();
    await page.waitForTimeout(3000);

    // Check the compact modal container and the internal scroll area
    const container = page.locator('.diff-container.diff-container-compact');
    const containerOverflow = await container.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.overflow;
    });
    const diffContent = page.locator('.diff-unified-content');
    const diffScrollState = await diffContent.evaluate(el => ({
      overflowY: window.getComputedStyle(el).overflowY,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    }));

    console.log('Container overflow:', containerOverflow);
    console.log('Diff content scroll state:', diffScrollState);

    const isCompactWithinViewport = await container.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.width < window.innerWidth && rect.height < window.innerHeight;
    });

    console.log('Is compact within viewport:', isCompactWithinViewport);

    expect(isCompactWithinViewport).toBe(true);
    expect(containerOverflow).toBe('hidden');
    expect(diffScrollState.overflowY === 'auto' || diffScrollState.overflowY === 'scroll').toBe(true);
    expect(diffScrollState.scrollHeight).toBeGreaterThanOrEqual(diffScrollState.clientHeight);
  });
});
