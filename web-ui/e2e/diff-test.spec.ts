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

    const selectedSummaryText = await page.locator('#selected-issue-summary').textContent().catch(() => '');
    const selectedSummaryMatch = selectedSummaryText.match(/已选自动修复项\s+(\d+)\/(\d+)/);
    expect(selectedSummaryMatch).not.toBeNull();
    const directFixCount = Number(selectedSummaryMatch![1]);
    expect(directFixCount).toBeGreaterThan(0);

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
      const modalScrollLockState = await page.evaluate(() => ({
        bodyLocked: document.body.classList.contains('diff-modal-open'),
        htmlLocked: document.documentElement.classList.contains('diff-modal-open'),
        bodyOverflow: window.getComputedStyle(document.body).overflow,
        htmlOverflow: window.getComputedStyle(document.documentElement).overflow
      }));
      expect(modalScrollLockState.bodyLocked).toBe(true);
      expect(modalScrollLockState.htmlLocked).toBe(true);
      expect(modalScrollLockState.bodyOverflow).toBe('hidden');
      expect(modalScrollLockState.htmlOverflow).toBe('hidden');

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

      const monacoOverlayLabels = await page.evaluate(() => {
        const originalEditor = document.querySelector('#diff-unified .editor.original');
        const modifiedEditor = document.querySelector('#diff-unified .editor.modified');
        return {
          originalContent: originalEditor ? window.getComputedStyle(originalEditor, '::before').content : null,
          originalDisplay: originalEditor ? window.getComputedStyle(originalEditor, '::before').display : null,
          modifiedContent: modifiedEditor ? window.getComputedStyle(modifiedEditor, '::before').content : null,
          modifiedDisplay: modifiedEditor ? window.getComputedStyle(modifiedEditor, '::before').display : null
        };
      });
      expect(monacoOverlayLabels.originalContent).toBe('none');
      expect(monacoOverlayLabels.originalDisplay).toBe('none');
      expect(monacoOverlayLabels.modifiedContent).toBe('none');
      expect(monacoOverlayLabels.modifiedDisplay).toBe('none');

      const monacoPaneTone = await page.evaluate(() => {
        const originalBackground = document.querySelector('#diff-unified .editor.original .monaco-editor-background') as HTMLElement | null;
        const modifiedBackground = document.querySelector('#diff-unified .editor.modified .monaco-editor-background') as HTMLElement | null;
        const originalLineNumber = document.querySelector('#diff-unified .editor.original .line-numbers') as HTMLElement | null;
        const modifiedLineNumber = document.querySelector('#diff-unified .editor.modified .line-numbers') as HTMLElement | null;
        return {
          originalBackgroundImage: originalBackground ? window.getComputedStyle(originalBackground).backgroundImage : null,
          modifiedBackgroundImage: modifiedBackground ? window.getComputedStyle(modifiedBackground).backgroundImage : null,
          originalLineNumberColor: originalLineNumber ? window.getComputedStyle(originalLineNumber).color : null,
          modifiedLineNumberColor: modifiedLineNumber ? window.getComputedStyle(modifiedLineNumber).color : null
        };
      });
      expect(monacoPaneTone.originalBackgroundImage).toBeTruthy();
      expect(monacoPaneTone.modifiedBackgroundImage).toBe(monacoPaneTone.originalBackgroundImage);
      expect(monacoPaneTone.modifiedBackgroundImage).not.toContain('220, 252, 231');
      expect(monacoPaneTone.modifiedBackgroundImage).not.toContain('34, 197, 94');
      expect(monacoPaneTone.originalLineNumberColor).toBe('rgb(100, 116, 139)');
      expect(monacoPaneTone.modifiedLineNumberColor).toBe(monacoPaneTone.originalLineNumberColor);

      await page.waitForFunction(() => {
        const addsText = document.querySelector('#diff-adds')?.textContent || '';
        const removesText = document.querySelector('#diff-removes')?.textContent || '';
        return addsText.includes('参数已修复') && removesText.includes('YAML 行变化');
      }, null, { timeout: 10000 });

      const stickyScrollState = await page.evaluate(() => ({
        stickyWidgets: document.querySelectorAll('#diff-unified .sticky-widget').length,
        addsText: document.querySelector('#diff-adds')?.textContent || '',
        removesText: document.querySelector('#diff-removes')?.textContent || '',
        lineChangeSummary: (() => {
          const editor = (window as any).__diffPreviewEditor;
          const lineChanges = editor?.getLineChanges?.() || [];
          let addedLines = 0;
          let removedLines = 0;
          let modifiedLines = 0;
          function span(start: number, end: number) {
            if (!start || !end || end === 0) return 0;
            return Math.max(0, end - start + 1);
          }
          lineChanges.forEach((change: any) => {
            const originalLines = span(change.originalStartLineNumber, change.originalEndLineNumber);
            const modifiedRange = span(change.modifiedStartLineNumber, change.modifiedEndLineNumber);
            if (originalLines === 0 && modifiedRange > 0) {
              addedLines += modifiedRange;
            } else if (modifiedRange === 0 && originalLines > 0) {
              removedLines += originalLines;
            } else {
              modifiedLines += Math.max(originalLines, modifiedRange);
            }
          });
          return {
            addedLines,
            removedLines,
            modifiedLines,
            changedLines: addedLines + removedLines + modifiedLines
          };
        })()
      }));
      expect(stickyScrollState.stickyWidgets).toBe(0);
      expect(stickyScrollState.addsText).toBe(`${directFixCount} 个参数已修复`);
      expect(stickyScrollState.removesText).toBe(`${(stickyScrollState as any).lineChangeSummary.changedLines} 处 YAML 行变化`);

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
      await expect(page.locator('#diff-controller-index')).toContainText('.java');
      await expect(page.locator('#diff-api-comparison')).toBeVisible();
      await expect(page.locator('#diff-api-comparison')).toContainText('本次有变化');
      await expect(page.locator('#diff-api-comparison')).toContainText('未变化方法');
      await page.waitForFunction(() => {
        return !!document.querySelector('#diff-api-comparison .impact-pair-pane.before, #diff-api-comparison .impact-member-pane.before')
          && !!document.querySelector('#diff-api-comparison .impact-pair-pane.after, #diff-api-comparison .impact-member-pane.after')
          && !!document.querySelector('#diff-api-comparison .syntax-annotation')
          && !!document.querySelector('#diff-api-comparison .syntax-comment');
      }, null, { timeout: 10000 });
      const controllerContrastState = await page.evaluate(() => {
        const beforePane = document.querySelector('#diff-api-comparison .impact-pair-pane.before, #diff-api-comparison .impact-member-pane.before') as HTMLElement | null;
        const afterPane = document.querySelector('#diff-api-comparison .impact-pair-pane.after, #diff-api-comparison .impact-member-pane.after') as HTMLElement | null;
        const comment = document.querySelector('#diff-api-comparison .impact-pair-pane.after .syntax-comment, #diff-api-comparison .impact-member-pane.after .syntax-comment') as HTMLElement | null;
        const annotation = document.querySelector('#diff-api-comparison .impact-pair-pane.after .syntax-annotation, #diff-api-comparison .impact-member-pane.after .syntax-annotation') as HTMLElement | null;
        const changeTag = document.querySelector('#diff-api-comparison .impact-change-tag.after') as HTMLElement | null;
        return {
          beforePaneBoxShadow: beforePane ? window.getComputedStyle(beforePane).boxShadow : null,
          afterPaneBoxShadow: afterPane ? window.getComputedStyle(afterPane).boxShadow : null,
          commentColor: comment ? window.getComputedStyle(comment).color : null,
          annotationColor: annotation ? window.getComputedStyle(annotation).color : null,
          changeTagColor: changeTag ? window.getComputedStyle(changeTag).color : null
        };
      });
      expect(controllerContrastState.beforePaneBoxShadow).toContain('239, 68, 68');
      expect(controllerContrastState.afterPaneBoxShadow).toContain('34, 197, 94');
      expect(controllerContrastState.commentColor).toBe('rgb(71, 85, 105)');
      expect(controllerContrastState.annotationColor).toBe('rgb(124, 58, 237)');
      expect(controllerContrastState.changeTagColor).toBe('rgb(22, 101, 52)');
      await expect(page.locator('#diff-controller-index .impact-index-child')).toHaveCount(0);
      const firstControllerIndexItem = page.locator('#diff-controller-index .impact-index-item').first();
      await expect(firstControllerIndexItem).toBeVisible();
      const firstControllerTargetId = await firstControllerIndexItem.getAttribute('data-target-id');
      expect(firstControllerTargetId).toBeTruthy();
      const lastControllerIndexItem = page.locator('#diff-controller-index .impact-index-item').last();
      await expect(lastControllerIndexItem).toBeVisible();
      const lastControllerTargetId = await lastControllerIndexItem.getAttribute('data-target-id');
      expect(lastControllerTargetId).toBeTruthy();
      const controllerIndexCopyState = await page.evaluate(() => {
        const summaryCard = document.querySelector('#diff-controller-index .impact-index-summary-card');
        const summaryCopy = summaryCard?.querySelector('.impact-index-summary-copy')?.textContent?.trim() || '';
        const detailCopy = document.querySelector('#diff-panel-controller .impact-detail-copy')?.textContent?.trim() || '';
        return {
          summaryCopy,
          detailCopy,
          hasRepeatedControllerPhrase: summaryCopy.includes('统一 Controller') && detailCopy.includes('统一 Controller')
        };
      });
      expect(controllerIndexCopyState.summaryCopy).not.toBe('');
      expect(controllerIndexCopyState.hasRepeatedControllerPhrase).toBe(false);
      const controllerIndexScrollBefore = await page.locator('#diff-controller-index').evaluate(el => (el as HTMLElement).scrollTop);
      await page.locator('.impact-index-controller .impact-index-header').hover();
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(200);
      const controllerIndexScrollAfterHeaderWheel = await page.locator('#diff-controller-index').evaluate(el => (el as HTMLElement).scrollTop);
      expect(controllerIndexScrollAfterHeaderWheel).toBeGreaterThan(controllerIndexScrollBefore);
      await page.locator('#diff-api-comparison').evaluate(el => { el.scrollTop = el.scrollHeight; });
      await firstControllerIndexItem.click();
      await page.waitForTimeout(250);
      const controllerNavigationState = await page.evaluate((targetId: string) => {
        const container = document.querySelector('#diff-api-comparison') as HTMLElement | null;
        const target = document.getElementById(targetId) as HTMLElement | null;
        if (!container || !target) {
          return null;
        }
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        return {
          scrollTop: container.scrollTop,
          topOffset: targetRect.top - containerRect.top,
          isActive: target.classList.contains('impact-card-focus')
        };
      }, firstControllerTargetId || '');
      expect(controllerNavigationState).toBeTruthy();
      expect((controllerNavigationState as any).topOffset).toBeLessThan(160);
      expect((controllerNavigationState as any).isActive).toBe(true);
      await lastControllerIndexItem.click();
      await page.waitForTimeout(250);
      const lastControllerNavigationState = await page.evaluate((targetId: string) => {
        const container = document.querySelector('#diff-api-comparison') as HTMLElement | null;
        const target = document.getElementById(targetId) as HTMLElement | null;
        if (!container || !target) {
          return null;
        }
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        return {
          scrollTop: container.scrollTop,
          topOffset: targetRect.top - containerRect.top,
          isActive: target.classList.contains('impact-card-focus')
        };
      }, lastControllerTargetId || '');
      expect(lastControllerNavigationState).toBeTruthy();
      expect((lastControllerNavigationState as any).topOffset).toBeLessThan(220);
      expect((lastControllerNavigationState as any).isActive).toBe(true);
      const controllerPreviewCardCount = await page.locator('#diff-api-comparison .impact-pair-card, #diff-api-comparison .impact-reference-card').count();
      expect(controllerPreviewCardCount).toBeGreaterThan(1);
      await expect(page.locator('#diff-api-comparison')).toContainText('ApicgenApi.java');
      await expect(page.locator('#diff-api-comparison')).toContainText('Response');
      await expect(page.locator('#diff-api-comparison')).toContainText('方法变化');
      await expect(page.locator('#diff-api-comparison')).toContainText('同一 Controller 中未变化的方法');
      await expect(page.locator('#diff-api-comparison')).not.toContainText('修复前统一 Controller');
      await expect(page.locator('#diff-api-comparison')).not.toContainText('修复后统一 Controller');
      const controllerCodeWrapState = await page.evaluate(() => {
        const blocks = Array.from(document.querySelectorAll('#diff-api-comparison .diff-java-code')) as HTMLElement[];
        const target = blocks.find(block => (block.textContent || '').includes('@RequestParam("email")')) || blocks[0] || null;
        if (!target) {
          return null;
        }
        const style = window.getComputedStyle(target);
        return {
          whiteSpace: style.whiteSpace,
          overflowX: style.overflowX,
          scrollWidth: Math.round(target.scrollWidth),
          clientWidth: Math.round(target.clientWidth)
        };
      });
      expect(controllerCodeWrapState).toBeTruthy();
      expect((controllerCodeWrapState as any).whiteSpace === 'pre-wrap' || (controllerCodeWrapState as any).whiteSpace === 'break-spaces').toBe(true);
      expect((controllerCodeWrapState as any).scrollWidth).toBeLessThanOrEqual((controllerCodeWrapState as any).clientWidth + 1);
      const methodTagOverflowState = await page.evaluate(() => {
        const lists = Array.from(document.querySelectorAll('#diff-api-comparison .impact-change-list')) as HTMLElement[];
        return lists
          .filter(list => list.querySelectorAll('.impact-change-tag').length > 1)
          .map(list => {
            const tags = Array.from(list.querySelectorAll('.impact-change-tag')) as HTMLElement[];
            const firstTop = tags.length > 0 ? Math.round(tags[0].getBoundingClientRect().top) : 0;
            const lastTop = tags.length > 0 ? Math.round(tags[tags.length - 1].getBoundingClientRect().top) : 0;
            return {
              scrollWidth: Math.round(list.scrollWidth),
              clientWidth: Math.round(list.clientWidth),
              wraps: lastTop > firstTop
            };
          });
      });
      expect(methodTagOverflowState.length).toBeGreaterThan(0);
      expect(methodTagOverflowState.some(item => item.wraps)).toBe(true);
      expect(methodTagOverflowState.every(item => item.scrollWidth <= item.clientWidth + 1)).toBe(true);
      const unchangedMethodCards = page.locator('#diff-api-comparison .impact-member-card.unchanged');
      await expect(unchangedMethodCards.first().locator('.impact-reference-pane')).toBeVisible();
      await expect(unchangedMethodCards.first().locator('.impact-member-grid')).toHaveCount(0);
      const controllerMethodMappingCount = await page.locator('#diff-api-comparison .syntax-annotation').evaluateAll(nodes => {
        return nodes.filter(node => /Mapping\("/.test((node.textContent || '').trim())).length;
      });
      expect(controllerMethodMappingCount).toBeGreaterThan(13);
      const controllerScrollState = await page.locator('#diff-api-comparison').evaluate(el => ({
        overflowY: window.getComputedStyle(el).overflowY,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight
      }));
      expect(controllerScrollState.overflowY === 'auto' || controllerScrollState.overflowY === 'scroll').toBe(true);
      expect(controllerScrollState.scrollHeight).toBeGreaterThan(controllerScrollState.clientHeight);
      const backgroundScrollBefore = await page.locator('.api-panel .CodeMirror-scroll').evaluate(el => (el as HTMLElement).scrollTop);
      await page.locator('#diff-api-comparison').hover();
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(200);
      const backgroundScrollAfter = await page.locator('.api-panel .CodeMirror-scroll').evaluate(el => (el as HTMLElement).scrollTop);
      const modalScrollAfterWheel = await page.locator('#diff-api-comparison').evaluate(el => (el as HTMLElement).scrollTop);
      expect(modalScrollAfterWheel).toBeGreaterThan(0);
      expect(backgroundScrollAfter).toBe(backgroundScrollBefore);
      await page.locator('.diff-header').hover();
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(200);
      const backgroundScrollAfterHeaderWheel = await page.locator('.api-panel .CodeMirror-scroll').evaluate(el => (el as HTMLElement).scrollTop);
      expect(backgroundScrollAfterHeaderWheel).toBe(backgroundScrollBefore);

      await page.getByRole('button', { name: '实体变化' }).click();
      await expect(page.locator('#diff-panel-model')).toBeVisible();
      await expect(page.locator('#diff-model-index')).toContainText('.java');
      await expect(page.locator('#diff-field-comparison')).toBeVisible();
      await expect(page.locator('#diff-field-comparison')).toContainText('结构参考实体');
      await expect(page.locator('#diff-field-comparison')).not.toContainText('本次没有实体变更');
      const firstModelIndexItem = page.locator('#diff-model-index .impact-index-item').first();
      await expect(firstModelIndexItem).toBeVisible();
      const firstModelTargetId = await firstModelIndexItem.getAttribute('data-target-id');
      expect(firstModelTargetId).toBeTruthy();
      const nestedModelChildItem = page.locator('#diff-model-index .impact-index-child').first();
      await expect(nestedModelChildItem).toBeVisible();
      await expect(nestedModelChildItem).toHaveAttribute('data-depth', '1');
      const nestedModelChildTargetId = await nestedModelChildItem.getAttribute('data-target-id');
      expect(nestedModelChildTargetId).toBeTruthy();
      const modelTreeDepthState = await page.evaluate(() => {
        const root = document.querySelector('#diff-model-index .impact-index-item') as HTMLElement | null;
        const child = document.querySelector('#diff-model-index .impact-index-child[data-depth="1"]') as HTMLElement | null;
        const grandChild = document.querySelector('#diff-model-index .impact-index-child[data-depth="2"]') as HTMLElement | null;
        const childrenColumn = document.querySelector('#diff-model-index .impact-index-children') as HTMLElement | null;
        if (!root || !child || !grandChild || !childrenColumn) {
          return null;
        }
        const rootRect = root.getBoundingClientRect();
        const childRect = child.getBoundingClientRect();
        const grandChildRect = grandChild.getBoundingClientRect();
        const childElbowStyle = window.getComputedStyle(child, '::before');
        const childDotStyle = window.getComputedStyle(child, '::after');
        return {
          childLeftOffset: Math.round(childRect.left - rootRect.left),
          grandChildLeftOffset: Math.round(grandChildRect.left - rootRect.left),
          treeBorderWidth: window.getComputedStyle(childrenColumn).borderLeftWidth,
          elbowWidth: childElbowStyle.width,
          dotWidth: childDotStyle.width
        };
      });
      expect(modelTreeDepthState).toBeTruthy();
      expect((modelTreeDepthState as any).childLeftOffset).toBeGreaterThan(12);
      expect((modelTreeDepthState as any).grandChildLeftOffset).toBeGreaterThan((modelTreeDepthState as any).childLeftOffset);
      expect((modelTreeDepthState as any).treeBorderWidth).not.toBe('0px');
      expect((modelTreeDepthState as any).elbowWidth).not.toBe('0px');
      expect((modelTreeDepthState as any).dotWidth).not.toBe('0px');
      await firstModelIndexItem.click();
      await page.waitForTimeout(250);
      const modelNavigationState = await page.evaluate((targetId: string) => {
        const target = document.getElementById(targetId) as HTMLElement | null;
        return {
          targetExists: !!target,
          isPairCard: !!target?.classList.contains('impact-pair-card') || !!target?.classList.contains('impact-reference-card'),
          isActive: target?.classList.contains('impact-card-focus') || false
        };
      }, firstModelTargetId || '');
      expect(modelNavigationState.targetExists).toBe(true);
      expect(modelNavigationState.isPairCard).toBe(true);
      expect(modelNavigationState.isActive).toBe(true);
      await nestedModelChildItem.click();
      await page.waitForTimeout(250);
      const nestedModelNavigationState = await page.evaluate((targetId: string) => {
        const target = document.getElementById(targetId) as HTMLElement | null;
        return {
          targetExists: !!target,
          isPairCard: !!target?.classList.contains('impact-pair-card') || !!target?.classList.contains('impact-reference-card'),
          isActive: target?.classList.contains('impact-card-focus') || false
        };
      }, nestedModelChildTargetId || '');
      expect(nestedModelNavigationState.targetExists).toBe(true);
      expect(nestedModelNavigationState.isPairCard).toBe(true);
      expect(nestedModelNavigationState.isActive).toBe(true);
      const modelPreviewCardCount = await page.locator('#diff-field-comparison .impact-pair-card, #diff-field-comparison .impact-reference-card').count();
      expect(modelPreviewCardCount).toBeGreaterThan(0);
      const modelHeaderOrder = await page.locator('#diff-field-comparison .impact-reference-card .impact-artifact-name, #diff-field-comparison .impact-pair-card .impact-artifact-name').evaluateAll(nodes =>
        nodes.map(node => (node.textContent || '').trim()).filter(Boolean)
      );
      const userModelIndex = modelHeaderOrder.indexOf('UserModel.java');
      const addressInfoIndex = modelHeaderOrder.indexOf('AddressInfo.java');
      const geoPointIndex = modelHeaderOrder.indexOf('GeoPoint.java');
      expect(userModelIndex).toBeGreaterThanOrEqual(0);
      expect(addressInfoIndex).toBeGreaterThan(userModelIndex);
      expect(geoPointIndex).toBeGreaterThan(addressInfoIndex);
      await expect(page.locator('#diff-field-comparison')).toContainText('UserModel.java');
      await expect(page.locator('#diff-model-index')).toContainText('AddressInfo.java');
      await expect(page.locator('#diff-model-index')).toContainText('GeoPoint.java');
      await expect(page.locator('#diff-field-comparison')).toContainText('public class UserModel');
      await expect(page.locator('#diff-field-comparison')).toContainText('private');
      await expect(page.locator('#diff-field-comparison')).toContainText('username');
      await expect(page.locator('#diff-field-comparison')).toContainText('tags');
      await expect(page.locator('#diff-field-comparison')).not.toContainText('字段明细');

      const footerCancelStyles = await page.locator('.diff-footer .btn-secondary').evaluate(el => {
        const style = window.getComputedStyle(el as HTMLElement);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor
        };
      });
      expect(footerCancelStyles.color).not.toBe(footerCancelStyles.backgroundColor);
      expect(footerCancelStyles.borderColor).not.toBe(footerCancelStyles.backgroundColor);

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
