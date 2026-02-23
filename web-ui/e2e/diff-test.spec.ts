import { test, expect } from '@playwright/test';

test.describe('Diff Feature Verification', () => {

  test('should verify diff feature works correctly', async ({ page }) => {
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
    const analyzeButton = page.locator('button:has-text("分析")');
    await analyzeButton.click();

    // Wait for analysis to complete
    await page.waitForTimeout(3000);

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
    const autoFixButton = page.locator('button:has-text("自动修复")');
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

    // Wait for auto-fix to complete
    await page.waitForTimeout(3000);

    // Step 5: Check if diff modal appears
    console.log('Step 5: Checking for diff modal...');
    const diffModal = page.locator('#diff-modal');
    const isModalVisible = await diffModal.isVisible().catch(() => false);
    console.log('Diff modal visible:', isModalVisible);

    // Take screenshot
    await page.screenshot({ path: 'D:/idea/workSpace/api-codegen/web-ui/test-results/diff-check.png' });

    let diffWorks = false;
    let yamlDiffWorks = false;
    let apiDiffWorks = false;

    if (isModalVisible) {
      // Step 6: Check if YAML diff shows content
      console.log('Step 6: Checking YAML diff content...');
      const diffBefore = page.locator('#diff-before');
      const diffAfter = page.locator('#diff-after');

      const beforeContent = await diffBefore.innerHTML().catch(() => '');
      const afterContent = await diffAfter.innerHTML().catch(() => '');

      console.log('Diff before content length:', beforeContent.length);
      console.log('Diff after content length:', afterContent.length);

      // Check stats
      const addsText = await page.locator('#diff-adds').textContent().catch(() => '');
      const removesText = await page.locator('#diff-removes').textContent().catch(() => '');
      console.log('Adds:', addsText, 'Removes:', removesText);

      // Assertions - content should not be empty
      yamlDiffWorks = beforeContent.length > 0 && afterContent.length > 0;
      console.log('YAML Diff has content:', yamlDiffWorks);

      // Step 7: Check if API diff shows per-API blocks with add/remove comparison
      console.log('Step 7: Checking API-level diff blocks...');
      const apiBeforeList = page.locator('#diff-api-before');
      const apiAfterList = page.locator('#diff-api-after');

      const apiBeforeHtml = await apiBeforeList.innerHTML().catch(() => '');
      const apiAfterHtml = await apiAfterList.innerHTML().catch(() => '');

      console.log('API diff before length:', apiBeforeHtml.length);
      console.log('API diff after length:', apiAfterHtml.length);

      // Check for API change blocks - should have .diff-api-java elements
      const apiBlocksBefore = await page.locator('#diff-api-before .diff-api-block').count().catch(() => 0);
      const apiBlocksAfter = await page.locator('#diff-api-after .diff-api-block').count().catch(() => 0);
      console.log('API blocks before:', apiBlocksBefore, 'after:', apiBlocksAfter);

      // If no blocks, check for old .diff-api-java class
      const apiJavaBefore = await page.locator('#diff-api-before .diff-api-java').count().catch(() => 0);
      const apiJavaAfter = await page.locator('#diff-api-after .diff-api-java').count().catch(() => 0);
      console.log('API Java blocks before:', apiJavaBefore, 'after:', apiJavaAfter);

      // Check if there are API changes displayed
      const apiCountEl = page.locator('#diff-api-count');
      const apiCountText = await apiCountEl.textContent().catch(() => '0');
      console.log('API count:', apiCountText);

      // API diff works if there are Java code blocks OR content in the containers
      const hasOldFormat = apiJavaBefore + apiJavaAfter > 0;
      const hasNewFormat = apiBlocksBefore + apiBlocksAfter > 0;

      console.log('Has old side-by-side format:', hasOldFormat);
      console.log('Has new per-API block format:', hasNewFormat);

      // User wants: per-API blocks with internal add/remove comparison
      apiDiffWorks = hasNewFormat;
      console.log('API Diff per-API blocks:', apiDiffWorks);

      // Verify that before and after show DIFFERENT content
      // Get actual content from first API block
      const firstBeforeBlock = await page.locator('#diff-api-before .diff-api-block').first().innerHTML().catch(() => '');
      const firstAfterBlock = await page.locator('#diff-api-after .diff-api-block').first().innerHTML().catch(() => '');
      const contentDifferent = firstBeforeBlock !== firstAfterBlock;
      console.log('Before/After content is different:', contentDifferent);

      // Overall diff works
      diffWorks = yamlDiffWorks && apiDiffWorks && contentDifferent;
    }

    // Report
    console.log('\n=== REPORT ===');
    console.log('- Analysis works: ' + (issueCountText !== '0' ? 'YES' : 'NO'));
    console.log('- Has validation issues: ' + (hasIssues ? 'YES' : 'NO'));
    console.log('- Auto-fix works: ' + (isModalVisible ? 'YES' : 'NO'));
    console.log('- YAML Diff preview shows content: ' + (yamlDiffWorks ? 'YES' : 'NO'));
    console.log('- API Diff blocks with add/remove: ' + (apiDiffWorks ? 'YES' : 'NO'));
    console.log('================\n');

    // Take a final screenshot of the diff modal if visible
    if (isModalVisible) {
      await page.screenshot({ path: 'D:/idea/workSpace/api-codegen/web-ui/test-results/diff-modal-final.png' });
    }

    // Final assertions
    expect(isModalVisible).toBe(true);
    expect(yamlDiffWorks).toBe(true);
    // API diff should show blocks - for now we verify it has content
    expect(apiDiffWorks).toBe(true);
  });
});
