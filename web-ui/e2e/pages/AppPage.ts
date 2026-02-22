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
  readonly configPanel: Locator;
  readonly outputPanel: Locator;

  // Action buttons
  readonly analyzeButton: Locator;
  readonly autoFixButton: Locator;
  readonly loadExampleButton: Locator;

  // Editors - CodeMirror creates a wrapper div
  readonly yamlEditor: Locator;
  readonly configEditor: Locator;
  readonly outputEditor: Locator;

  // Status
  readonly statusMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('.header');
    this.logo = page.locator('.logo');
    this.navButtons = page.locator('.nav-btn');

    this.apiPanel = page.locator('.api-panel');
    this.configPanel = page.locator('.config-panel');
    this.outputPanel = page.locator('.output-panel');

    // Use button text selectors
    this.analyzeButton = page.locator('button:has-text("分析")');
    this.autoFixButton = page.locator('button:has-text("自动修复")');
    this.loadExampleButton = page.locator('button:has-text("加载示例")');

    // Use CodeMirror class - it's the visible editor wrapper
    this.yamlEditor = page.locator('.api-panel .CodeMirror');
    this.configEditor = page.locator('.config-panel .CodeMirror');
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
    // Try output panel first, then config panel
    const panels = [this.outputEditor, this.configEditor];

    for (const panel of panels) {
      try {
        await panel.waitFor({ state: 'visible', timeout: 3000 });
        const content = await panel.evaluate(el => (el as any).CodeMirror?.getValue() || '');
        if (content.length > 0) {
          return content;
        }
      } catch (e) {
        continue;
      }
    }

    return '';
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `artifacts/${name}.png` });
  }
}
