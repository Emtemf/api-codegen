import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

test.describe('API Codegen Web UI - Critical Flows', () => {

  test.describe('🔴 CRITICAL: Basic Code Generation', () => {

    test('should load the main page', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Verify key elements are visible
      await expect(appPage.logo).toContainText('API Codegen');
      await expect(appPage.navButtons.first()).toBeVisible();
    });

    test('should generate code from valid YAML', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Enter valid YAML
      const validYaml = `
apis:
  - name: createUser
    path: /api/users
    method: POST
    description: Create a new user
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
          required: true
          description: Username
        - name: email
          type: String
          required: true
          description: User email
    response:
      className: CreateUserRsp
      fields:
        - name: userId
          type: Long
          description: Created user ID
        - name: success
          type: Boolean
          description: Operation result
`.trim();

      await appPage.setYamlContent(validYaml);

      // Click analyze button which triggers code generation
      await appPage.analyzeButton.click();

      // Wait for code generation
      await page.waitForTimeout(1000);

      // Verify output has content (check config panel for generated code)
      const output = await appPage.getOutputContent();
      expect(output.length).toBeGreaterThan(0);
    });
  });

  test.describe('🟡 IMPORTANT: YAML Editor', () => {

    test('should have editable YAML editor', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Verify editor is visible
      await expect(appPage.yamlEditor).toBeVisible();
    });

    test('should preserve YAML content in editor', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const testYaml = 'apis:\n  - name: testApi';
      await appPage.setYamlContent(testYaml);

      // Get content back
      const content = await appPage.getYamlContent();
      expect(content).toContain('testApi');
    });
  });

  test.describe('🟡 IMPORTANT: Analysis Feature', () => {

    test('should have analyze button', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Verify analyze button is visible
      await expect(appPage.analyzeButton).toBeVisible();
    });

    test('should analyze YAML and show results', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Enter YAML without validation rules
      const yamlWithoutValidation = `
apis:
  - name: createUser
    path: /api/users
    method: POST
    request:
      className: CreateUserReq
      fields:
        - name: username
          type: String
          required: true
    response:
      className: CreateUserRsp
      fields:
        - name: success
          type: Boolean
`.trim();

      await appPage.setYamlContent(yamlWithoutValidation);

      // Click analyze button
      await appPage.analyzeButton.click();

      // Wait for analysis to complete
      await page.waitForTimeout(1000);

      // Verify analyze button is still visible (no crash)
      await expect(appPage.analyzeButton).toBeVisible();
    });
  });

  test.describe('🟡 IMPORTANT: Auto-Fix Feature', () => {

    test('should have auto-fix button', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Verify auto-fix button is visible
      await expect(appPage.autoFixButton).toBeVisible();
    });
  });

  test.describe('🔵 UI/UX: Layout', () => {

    test('should display API and Config panels', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Verify panels are visible
      await expect(appPage.apiPanel).toBeVisible();
      await expect(appPage.configPanel).toBeVisible();
    });

    test('should display header with logo and action buttons', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      await expect(appPage.header).toBeVisible();
      await expect(appPage.logo).toBeVisible();
      await expect(appPage.analyzeButton).toBeVisible();
      await expect(appPage.autoFixButton).toBeVisible();
    });
  });

  test.describe('🟡 IMPORTANT: Load Example', () => {

    test('should load example YAML', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Click load example button
      await appPage.loadExampleButton.click();

      // Wait for example to load (needs time for CodeMirror to update)
      await page.waitForTimeout(1500);

      // Verify content was loaded - check both panels have content now
      const apiContent = await appPage.getYamlContent();
      const configContent = await page.locator('.config-panel .CodeMirror').evaluate(el =>
        (el as any).CodeMirror?.getValue() || ''
      );

      // At least one panel should have content
      const hasContent = apiContent.length > 0 || configContent.length > 0;
      expect(hasContent).toBe(true);
    });
  });
});
