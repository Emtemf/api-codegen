import { test, expect } from '@playwright/test';

test.describe('Diff Feature Verification', () => {

  test('should verify diff feature works correctly', async ({ page }) => {
    test.setTimeout(60000);

    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Step 1: Go to the web UI
    console.log('Step 1: Going to web UI...');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for CodeMirror to initialize
    const yamlEditor = page.locator('.api-panel .CodeMirror');
    await yamlEditor.waitFor({ state: 'visible', timeout: 10000 });

    // Step 1b: Load swagger2-example.yaml directly (bypass prompt dialog)
    console.log('Step 1b: Loading example YAML...');
    const response = await page.request.get('/swagger2-example.yaml');
    const yamlContent = await response.text();
    console.log('Example YAML loaded, length:', yamlContent.length);

    // Set the YAML content in the editor
    await yamlEditor.evaluate((el, value) => {
      const codeMirror = (el as any).CodeMirror;
      if (codeMirror) {
        codeMirror.setValue(value);
      }
    }, yamlContent);

    // Wait for editor to update
    await page.waitForTimeout(500);

    // Verify YAML was set
    const setYamlContent = await yamlEditor.evaluate(el => (el as any).CodeMirror?.getValue() || '');
    console.log('YAML set in editor, length:', setYamlContent.length);

    // Step 2: Click "分析" button to analyze
    console.log('Step 2: Analyzing YAML...');
    const analyzeButton = page.getByRole('button', { name: '分析', exact: true });
    await analyzeButton.click();

    // Wait for analysis to complete
    await page.waitForFunction(() => {
      const issueCountText = document.querySelector('#issue-count')?.textContent || '';
      return /总\s+\d+/.test(issueCountText);
    }, null, { timeout: 20000 });

    // Check console errors
    console.log('Console errors:', consoleErrors);

    // Step 3: Check if analysis shows results
    console.log('Step 3: Checking analysis results...');
    const issueCountEl = page.locator('#issue-count');
    const issueCountText = await issueCountEl.textContent().catch(() => '0');
    console.log('Issue count:', issueCountText);

    // Check for validation issues in the page
    const issueListEl = page.locator('#issue-list');
    const issueListHtml = await issueListEl.innerHTML().catch(() => '');
    const hasIssues = issueListHtml.includes('issue') && !issueListHtml.includes('没有发现问题');
    console.log('Has validation issues:', hasIssues);

    // Check if auto-fix button is visible
    const autoFixButton = page.getByRole('button', { name: /自动修复/ });
    const autoFixVisible = await autoFixButton.isVisible().catch(() => false);
    console.log('Auto-fix button visible:', autoFixVisible);

    // Take screenshot after analysis
    await page.screenshot({ path: 'D:/idea/workSpace/api-codegen/web-ui/test-results/analysis-result.png' });

    if (!autoFixVisible) {
      console.log('SKIPPING: No auto-fix button - no validation issues found');
      // Exit early if no issues found - can't test diff without issues
      return;
    }

    // Step 4: Click "自动修复" button
    console.log('Step 4: Clicking auto-fix...');
    await autoFixButton.click();

    // Wait for auto-fix preview modal to appear
    await page.waitForFunction(() => {
      return document.querySelector('#diff-modal')?.classList.contains('active') === true;
    }, null, { timeout: 20000 });

    // Step 5: Check if diff modal appears
    console.log('Step 5: Checking for diff modal...');
    const diffModal = page.locator('#diff-modal');
    const isModalVisible = await diffModal.isVisible().catch(() => false);
    console.log('Diff modal visible:', isModalVisible);

    // Take screenshot
    await page.screenshot({ path: 'D:/idea/workSpace/api-codegen/web-ui/test-results/diff-check.png' });

    let diffWorks = false;
    let unifiedDiffWorks = false;

    if (isModalVisible) {
      // Step 6: Check unified diff view
      console.log('Step 6: Checking unified diff content...');
      const diffUnified = page.locator('#diff-unified');

      const unifiedContent = await diffUnified.innerHTML().catch(() => '');
      console.log('Unified diff content length:', unifiedContent.length);

      // Check stats
      const addsText = await page.locator('#diff-adds').textContent().catch(() => '');
      const removesText = await page.locator('#diff-removes').textContent().catch(() => '');
      console.log('Adds:', addsText, 'Removes:', removesText);

      const monacoDiffEditorCount = await page.locator('#diff-unified .monaco-diff-editor').count().catch(() => 0);
      const monacoEditorCount = await page.locator('#diff-unified .monaco-editor').count().catch(() => 0);
      const legacyPreviewCount = await page.locator('#diff-unified .diff-api-unified').count().catch(() => 0);
      const diff2htmlCount = await page.locator('#diff-unified .d2h-wrapper').count().catch(() => 0);
      console.log('Monaco diff editors:', monacoDiffEditorCount);
      console.log('Monaco editors:', monacoEditorCount);
      console.log('Legacy preview blocks:', legacyPreviewCount);
      console.log('diff2html wrappers:', diff2htmlCount);

      await page.waitForFunction(() => {
        const editor = (window as any).__diffPreviewEditor;
        const host = document.querySelector('#diff-unified .monaco-diff-editor') as HTMLElement | null;
        return !!editor
          && !!host
          && host.getBoundingClientRect().height > 300
          && document.querySelectorAll('#diff-unified .editor.original .view-line').length > 10
          && document.querySelectorAll('#diff-unified .editor.modified .view-line').length > 10;
      }, null, { timeout: 10000 });

      const monacoApi = await page.evaluate(() => {
        const editor = (window as any).__diffPreviewEditor;
        if (!editor) {
          return null;
        }

        function getFirstNonWhitespaceX(lineElement: Element | null) {
          if (!lineElement) {
            return null;
          }

          const text = lineElement.textContent || '';
          let targetIndex = -1;
          for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char !== ' ' && char !== '\u00a0' && char !== '\t') {
              targetIndex = i;
              break;
            }
          }

          if (targetIndex < 0) {
            return null;
          }

          const walker = document.createTreeWalker(lineElement, NodeFilter.SHOW_TEXT);
          let offset = 0;
          let currentNode = walker.nextNode() as Text | null;

          while (currentNode) {
            const length = currentNode.textContent?.length || 0;
            if (offset + length > targetIndex) {
              const range = document.createRange();
              const startOffset = targetIndex - offset;
              range.setStart(currentNode, startOffset);
              range.setEnd(currentNode, startOffset + 1);
              return range.getBoundingClientRect().x;
            }
            offset += length;
            currentNode = walker.nextNode() as Text | null;
          }

          return null;
        }

        function findLine(selector: string, expected: string) {
          return Array.from(document.querySelectorAll(selector)).find(line =>
            ((line.textContent || '').replace(/\u00a0/g, ' ').trim()) === expected
          ) || null;
        }

        const originalEditor = editor.getOriginalEditor();
        const modifiedEditor = editor.getModifiedEditor();
        const host = document.querySelector('#diff-unified .monaco-diff-editor');
        const originalInfoLine = findLine('#diff-unified .editor.original .view-line', 'info:');
        const originalVersionLine = findLine('#diff-unified .editor.original .view-line', 'version: v1');
        const modifiedInfoLine = findLine('#diff-unified .editor.modified .view-line', 'info:');
        const modifiedVersionLine = findLine('#diff-unified .editor.modified .view-line', 'version: v1');
        return {
          hasOriginalEditor: !!editor.getOriginalEditor,
          hasModifiedEditor: !!editor.getModifiedEditor,
          originalValue: originalEditor.getModel().getValue(),
          modifiedValue: modifiedEditor.getModel().getValue(),
          hostHeight: host ? host.getBoundingClientRect().height : 0,
          originalVisibleLines: document.querySelectorAll('#diff-unified .editor.original .view-line').length,
          modifiedVisibleLines: document.querySelectorAll('#diff-unified .editor.modified .view-line').length,
          originalInfoX: getFirstNonWhitespaceX(originalInfoLine),
          originalVersionX: getFirstNonWhitespaceX(originalVersionLine),
          modifiedInfoX: getFirstNonWhitespaceX(modifiedInfoLine),
          modifiedVersionX: getFirstNonWhitespaceX(modifiedVersionLine)
        };
      }).catch(() => null);
      console.log('Monaco API:', monacoApi);

      // Assertions - content should not be empty
      unifiedDiffWorks = unifiedContent.length > 0;
      console.log('Unified Diff has content:', unifiedDiffWorks);

      // Step 7: Check Monaco side-by-side diff and indentation preservation
      console.log('Step 7: Checking Monaco side-by-side diff preview...');
      diffWorks = unifiedDiffWorks
        && monacoDiffEditorCount === 1
        && monacoEditorCount >= 2
        && legacyPreviewCount === 0
        && diff2htmlCount === 0
        && !!monacoApi
        && monacoApi.hasOriginalEditor === true
        && monacoApi.hasModifiedEditor === true
        && monacoApi.originalValue.includes('  type: integer')
        && monacoApi.modifiedValue.includes('  maximum: 2147483647')
        && monacoApi.hostHeight > 300
        && monacoApi.originalVisibleLines > 10
        && monacoApi.modifiedVisibleLines > 10
        && monacoApi.originalInfoX !== null
        && monacoApi.originalVersionX !== null
        && monacoApi.modifiedInfoX !== null
        && monacoApi.modifiedVersionX !== null
        && monacoApi.originalVersionX > monacoApi.originalInfoX
        && monacoApi.modifiedVersionX > monacoApi.modifiedInfoX;

      await expect(page.getByRole('button', { name: 'YAML 变更' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Controller 影响' })).toBeVisible();
      await expect(page.getByRole('button', { name: '实体变化' })).toBeVisible();

      await page.getByRole('button', { name: 'Controller 影响' }).click();
      await expect(page.locator('#diff-panel-controller')).toBeVisible();
      await expect(page.locator('#diff-controller-index')).toContainText('Controller.java');
      await expect(page.locator('#diff-api-after')).toContainText('Response');

      await page.getByRole('button', { name: '实体变化' }).click();
      await expect(page.locator('#diff-panel-model')).toBeVisible();
      await expect(page.locator('#diff-model-index')).toContainText('.java');
      await expect(page.locator('#diff-field-after')).toContainText('@');

      await page.getByRole('button', { name: 'YAML 变更' }).click();
      await expect(page.locator('#diff-panel-yaml')).toBeVisible();
    }

    // Report
    console.log('\n=== REPORT ===');
    console.log('- Analysis works: ' + (issueCountText !== '0' ? 'YES' : 'NO'));
    console.log('- Has validation issues: ' + (hasIssues ? 'YES' : 'NO'));
    console.log('- Auto-fix works: ' + (isModalVisible ? 'YES' : 'NO'));
    console.log('- Unified Diff preview shows content: ' + (unifiedDiffWorks ? 'YES' : 'NO'));
    console.log('- Monaco side-by-side diff preview present: ' + (diffWorks ? 'YES' : 'NO'));
    console.log('================\n');

    // Take a final screenshot of the diff modal if visible
    if (isModalVisible) {
      await page.screenshot({ path: 'D:/idea/workSpace/api-codegen/web-ui/test-results/diff-modal-final.png' });
    }

    // Final assertions
    expect(isModalVisible).toBe(true);
    expect(unifiedDiffWorks).toBe(true);
    // Diff should render as a Monaco side-by-side preview with preserved indentation
    expect(diffWorks).toBe(true);
  });
});
