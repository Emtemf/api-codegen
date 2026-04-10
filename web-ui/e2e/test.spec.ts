import { test, expect } from '@playwright/test';
import { AppPage } from './pages/AppPage';

test.describe('API Codegen Web UI - Critical Flows', () => {

  test.describe('🔴 CRITICAL: Basic Code Generation', () => {

    test('should load the main page', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Verify current header/actions layout instead of the hidden legacy nav
      await expect(appPage.logo).toContainText('API Codegen');
      await expect(appPage.analyzeButton).toBeVisible();
      await expect(appPage.loadExampleButton).toBeVisible();
    });

    test('should analyze valid YAML and show no errors', async ({ page }) => {
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

      // Click analyze button
      await appPage.analyzeButton.click();

      // Wait for analysis
      await page.waitForTimeout(1000);

      // Verify no critical errors (analyze button still visible)
      await expect(appPage.analyzeButton).toBeVisible();
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

    test('should support switching to table view and syncing edits back to YAML', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const swaggerYaml = `
swagger: "2.0"
info:
  title: Demo API
  version: "1.0"
paths:
  /users:
    get:
      operationId: getUsers
      summary: 查询用户
      parameters:
        - name: keyword
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: OK
`.trim();

      await appPage.setYamlContent(swaggerYaml);
      await appPage.tableViewButton.click();

      await expect(page.locator('#table-editor-api-list .table-editor-nav-card')).toBeVisible();
      await page.locator('#table-editor-api-list .table-editor-nav-card').first().click();
      await page.locator('#table-editor-parameter-panel textarea').first().fill('表格模式下编辑描述');
      await page.locator('#table-editor-parameter-panel .table-parameter-card input').first().fill('searchKeyword');

      await appPage.yamlViewButton.click();
      const content = await appPage.getYamlContent();

      expect(content).toContain('name: searchKeyword');
      expect(content).toContain('description: 表格模式下编辑描述');
    });

    test('should focus the target parameter card when clicking parameter navigation chips', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const swaggerYaml = `
swagger: "2.0"
info:
  title: Demo API
  version: "1.0"
paths:
  /users:
    get:
      operationId: getUsers
      summary: 查询用户
      parameters:
        - name: keyword
          in: query
          type: string
        - name: pageNo
          in: query
          type: integer
      responses:
        "200":
          description: OK
`.trim();

      await appPage.setYamlContent(swaggerYaml);
      await appPage.tableViewButton.click();

      const secondJump = page.locator('#table-editor-parameter-panel .table-editor-param-jump').nth(1);
      await expect(secondJump).toContainText('pageNo');
      await secondJump.click();

      await expect(page.locator('#table-editor-parameter-panel .table-parameter-card.focused').nth(0)).toContainText('pageNo');
      await expect(page.locator('#table-editor-parameter-panel .table-editor-param-jump.active').nth(0)).toContainText('pageNo');
    });

    test('should show controller and current method code preview in table view', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const swaggerYaml = `
swagger: "2.0"
info:
  title: Demo API
  version: "1.0"
paths:
  /admin/users:
    x-java-class-annotations:
      - "@Secured"
    get:
      operationId: getAdminUsers
      summary: 获取用户列表
      x-java-method-annotations:
        - "@Permission(\\"admin:user:read\\")"
      parameters:
        - name: keyword
          in: query
          type: string
      responses:
        "200":
          description: OK
`.trim();

      await appPage.setYamlContent(swaggerYaml);
      await appPage.tableViewButton.click();

      const preview = page.locator('#table-editor-parameter-panel .table-editor-code-preview');
      await expect(preview).toBeVisible();
      await expect(preview).toContainText('注解归属');
      await expect(preview).toContainText('类级作用范围');
      await expect(preview).toContainText('当前方法注解');
      await expect(preview).toContainText('统一 Controller 类');
      await expect(preview).toContainText('当前方法预览');
      await expect(preview).toContainText('@RestController');
      await expect(preview).toContainText('@Secured');
      await expect(preview).toContainText('@Permission');
      await expect(preview).toContainText('getAdminUsers');
      await expect(page.locator('#table-editor-parameter-panel')).toContainText('YAML 原生字段');
      await expect(page.locator('#table-editor-parameter-panel')).toContainText('operationId（YAML）');
      await expect(page.locator('#table-editor-parameter-panel')).toContainText('摘要 summary（YAML）');
    });

    test('should explain body object limits in table view and guide users to $ref or YAML', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const swaggerYaml = `
swagger: "2.0"
info:
  title: Demo API
  version: "1.0"
paths:
  /users:
    post:
      operationId: createUser
      summary: 创建用户
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
      responses:
        "200":
          description: OK
`.trim();

      await appPage.setYamlContent(swaggerYaml);
      await appPage.tableViewButton.click();

      const panel = page.locator('#table-editor-parameter-panel');
      await expect(panel).toContainText('当前是 body / requestBody 建模');
      await expect(panel).toContainText('内联 object');
      await expect(panel).toContainText('改用 $ref 或切回 YAML');
    });

    test('should allow choosing parameter kind when adding a new parameter', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const swaggerYaml = `
swagger: "2.0"
info:
  title: Demo API
  version: "1.0"
paths:
  /users:
    get:
      operationId: getUsers
      summary: 查询用户
      responses:
        "200":
          description: OK
`.trim();

      await appPage.setYamlContent(swaggerYaml);
      await appPage.tableViewButton.click();

      await page.getByRole('button', { name: '新增参数' }).click();
      await page.getByRole('button', { name: '新增 path 参数' }).click();

      const panel = page.locator('#table-editor-parameter-panel');
      await expect(panel).toContainText('PATH');
      await expect(panel.locator('.table-parameter-card').first()).toContainText('path');
    });

    test('should offer selectable parameter shape and schema ref options', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const swaggerYaml = `
swagger: "2.0"
info:
  title: Demo API
  version: "1.0"
paths:
  /users:
    post:
      operationId: createUser
      summary: 创建用户
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
      responses:
        "200":
          description: OK
definitions:
  CreateUserReq:
    type: object
  AddressInfo:
    type: object
`.trim();

      await appPage.setYamlContent(swaggerYaml);
      await appPage.tableViewButton.click();

      const editorKind = page.locator('[data-table-param-editor-kind="post /users::0"]');
      await expect(editorKind).toBeVisible();
      await editorKind.selectOption('ref-object');

      const refSelect = page.locator('[data-table-param-ref-select="post /users::0"]');
      await expect(refSelect).toBeVisible();
      await expect(refSelect).toContainText('CreateUserReq');
      await expect(refSelect).toContainText('AddressInfo');

      const refInput = page.locator('[data-table-param-ref-input="post /users::0"]');
      await expect(refInput).toBeVisible();
      await expect(page.locator('#table-editor-parameter-panel')).toContainText('自定义 $ref 路径');
    });

    test('should create a schema shell and bind it when choosing entity modeling', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const swaggerYaml = `
swagger: "2.0"
info:
  title: Demo API
  version: "1.0"
paths:
  /users:
    post:
      operationId: createUser
      summary: 创建用户
      parameters:
        - name: body
          in: body
          required: true
          schema:
            type: object
      responses:
        "200":
          description: OK
`.trim();

      await appPage.setYamlContent(swaggerYaml);
      await appPage.tableViewButton.click();

      const editorKind = page.locator('[data-table-param-editor-kind="post /users::0"]');
      await editorKind.selectOption('ref-object');

      const createName = page.locator('[data-table-param-create-name="post /users::0"]').first();
      await createName.fill('CreateUserReq');
      await page.getByRole('button', { name: '新建实体并引用' }).first().click();

      await appPage.yamlViewButton.click();
      const yaml = await appPage.getYamlContent();
      expect(yaml).toContain('definitions:');
      expect(yaml).toContain('CreateUserReq:');
      expect(yaml).toContain('$ref: "#/definitions/CreateUserReq"');
      expect(yaml).not.toContain('type: object\n            $ref:');
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

    test('should display API panel', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Verify panels are visible
      await expect(appPage.apiPanel).toBeVisible();
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

    test('should keep analysis sidebar visible on medium laptop screens', async ({ page }) => {
      await page.setViewportSize({ width: 1160, height: 780 });

      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      const layout = await page.evaluate(() => {
        const main = document.querySelector('.main');
        const apiPanel = document.querySelector('.api-panel');
        const analysis = document.querySelector('.analysis');
        if (!main || !apiPanel || !analysis) {
          return null;
        }

        const mainStyle = window.getComputedStyle(main);
        const apiRect = apiPanel.getBoundingClientRect();
        const analysisRect = analysis.getBoundingClientRect();

        return {
          mainDisplay: mainStyle.display,
          mainColumns: mainStyle.gridTemplateColumns,
          mainRows: mainStyle.gridTemplateRows,
          apiBottomWithinViewport: apiRect.bottom <= window.innerHeight,
          analysisBottomWithinViewport: analysisRect.bottom <= window.innerHeight,
          analysisBesideApi: analysisRect.left >= apiRect.right - 2,
        };
      });

      expect(layout).not.toBeNull();
      expect(layout?.mainDisplay).toBe('grid');
      expect(layout?.mainColumns).toBeTruthy();
      expect(layout?.analysisBesideApi).toBe(true);
      expect(layout?.apiBottomWithinViewport).toBe(true);
      expect(layout?.analysisBottomWithinViewport).toBe(true);
    });

    test('should allow scrolling analysis results when content exceeds viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1365, height: 768 });

      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      page.on('dialog', async dialog => {
        await dialog.accept('1');
      });

      await appPage.loadExampleButton.click();
      await page.waitForTimeout(1500);
      await appPage.analyze();

      await expect.poll(async () => await appPage.getIssueCount(), { timeout: 20000 }).toBeGreaterThan(0);

      const scrollState = await page.evaluate(() => {
        const bodyStyle = window.getComputedStyle(document.body);
        const issueList = document.querySelector('#issue-list');
        if (!issueList) {
          return null;
        }
        const issueStyle = window.getComputedStyle(issueList);
        return {
          bodyOverflowY: bodyStyle.overflowY,
          pageScrollable: document.documentElement.scrollHeight >= window.innerHeight,
          issueOverflowY: issueStyle.overflowY,
          issueScrollable: issueList.scrollHeight > issueList.clientHeight,
        };
      });

      expect(scrollState).not.toBeNull();
      expect(scrollState?.bodyOverflowY).not.toBe('hidden');
      expect(
        scrollState?.pageScrollable === true ||
        (
          (scrollState?.issueOverflowY === 'auto' || scrollState?.issueOverflowY === 'scroll') &&
          scrollState?.issueScrollable === true
        )
      ).toBe(true);
    });
  });

  test.describe('🟡 IMPORTANT: Load Example', () => {

    test('should load example YAML', async ({ page }) => {
      const appPage = new AppPage(page);
      await appPage.goto();
      await appPage.waitForLoad();

      // Handle the prompt dialog
      page.on('dialog', async dialog => {
        // Accept with default or first option (enter "1")
        await dialog.accept('1');
      });

      // Click load example button
      await appPage.loadExampleButton.click();

      // Wait for example to load (needs time for CodeMirror to update)
      await page.waitForTimeout(2000);

      // Verify content was loaded
      const apiContent = await appPage.getYamlContent();

      // The example should have content now
      expect(apiContent.length).toBeGreaterThan(0);
    });
  });
});
