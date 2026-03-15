import { type Page, type Locator, expect } from '@playwright/test';

/**
 * API Codegen Web UI - Page Object Model
 */
export class AppPage {
  readonly page: Page;
  readonly header: Locator;
  readonly logo: Locator;
  readonly navButtons: Locator;

  // Panels
  readonly apiPanel: Locator;
  readonly outputPanel: Locator;

  // Action buttons
  readonly analyzeButton: Locator;
  readonly autoFixButton: Locator;
  readonly loadExampleButton: Locator;

  // Editors - CodeMirror creates a wrapper div
  readonly yamlEditor: Locator;
  readonly outputEditor: Locator;

  // Status
  readonly statusMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('.header');
    this.logo = page.locator('.logo');
    this.navButtons = page.locator('.nav-btn');

    this.apiPanel = page.locator('.api-panel');
    this.outputPanel = page.locator('.output-panel');

    // Use button text selectors
    this.analyzeButton = page.locator('button:has-text("分析")');
    this.autoFixButton = page.locator('button:has-text("自动修复")');
    this.loadExampleButton = page.locator('button:has-text("加载示例")');

    // Use CodeMirror class - it's the visible editor wrapper
    this.yamlEditor = page.locator('.api-panel .CodeMirror');
    this.outputEditor = page.locator('.output-panel .CodeMirror');

    this.statusMessage = page.locator('.status');
  }

  /**
   * Navigate to the app
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * Wait for the app to load
   */
  async waitForLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.logo).toBeVisible();
    // Wait for CodeMirror to initialize
    await this.yamlEditor.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get the YAML editor content using CodeMirror API
   */
  async getYamlContent(): Promise<string> {
    const cm = this.yamlEditor;
    await cm.waitFor({ state: 'visible' });
    return cm.evaluate(el => (el as any).CodeMirror?.getValue() || '');
  }

  /**
   * Set the YAML editor content using CodeMirror API
   */
  async setYamlContent(content: string) {
    const cm = this.yamlEditor;
    await cm.waitFor({ state: 'visible' });
    await cm.evaluate((el, value) => {
      const codeMirror = (el as any).CodeMirror;
      if (codeMirror) {
        codeMirror.setValue(value);
      }
    }, content);
  }

  /**
   * Click analyze button
   */
  async analyze() {
    await this.analyzeButton.click();
  }

  /**
   * Click auto-fix button
   */
  async autoFix() {
    await this.autoFixButton.click();
  }

  /**
   * Get generated output content
   */
  async getOutputContent(): Promise<string> {
    // Try output panel
    try {
      await this.outputEditor.waitFor({ state: 'visible', timeout: 3000 });
      const content = await this.outputEditor.evaluate(el => (el as any).CodeMirror?.getValue() || '');
      if (content.length > 0) {
        return content;
      }
    } catch (e) {
      // Output panel not available
    }

    return '';
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `artifacts/${name}.png` });
  }

  /**
   * Get issue count from the issue list
   */
  async getIssueCount(): Promise<number> {
    const issueList = this.page.locator('#issue-list');
    try {
      await issueList.waitFor({ state: 'visible', timeout: 3000 });
      const issues = issueList.locator('.issue');
      return await issues.count();
    } catch (e) {
      return 0;
    }
  }

  /**
   * Get all issues from the issue list
   */
  async getIssues(): Promise<any[]> {
    const issueList = this.page.locator('#issue-list');
    try {
      await issueList.waitFor({ state: 'visible', timeout: 3000 });
      const issues = issueList.locator('.issue');
      const count = await issues.count();

      const result = [];
      for (let i = 0; i < count; i++) {
        const issue = issues.nth(i);
        const message = await issue.locator('.issue-message').textContent().catch(() => '');
        const severity = await issue.getAttribute('class').catch(() => '');
        result.push({
          message: message,
          severity: severity.includes('error') ? 'error' : severity.includes('warn') ? 'warn' : 'info'
        });
      }
      return result;
    } catch (e) {
      return [];
    }
  }

  /**
   * Get "需手动" button for a specific issue by index
   */
  getManualFixButton(index: number): Locator {
    return this.page.locator('.issue').nth(index).locator('button.issue-fixable.fixable-no');
  }

  /**
   * Get edit modal
   */
  getEditModal(): Locator {
    return this.page.locator('.edit-modal-overlay');
  }

  /**
   * Check if edit modal is visible
   */
  async isEditModalVisible(): Promise<boolean> {
    try {
      const modal = this.getEditModal();
      await modal.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get description input in edit modal
   */
  getDescriptionInput(): Locator {
    return this.page.locator('#edit-description-input');
  }

  /**
   * Click apply button in edit modal
   */
  async clickApplyInEditModal() {
    await this.page.locator('.edit-modal-footer button.btn-primary').click();
  }

  /**
   * Close edit modal
   */
  async closeEditModal() {
    await this.page.locator('.edit-modal-close').click();
  }
}
